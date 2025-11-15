import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Mic,
  Square,
  Loader2,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Save,
  RefreshCcw,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { getMigraineService } from '../services/migraineService';
import type { MigraineReportFormData } from '../types/migraine';
import {
  applyVoiceFieldUpdate,
  extractVoiceAssistantMetadata,
  finalizeFormDataFromPartial,
  getMissingFields,
  mapVoicePayloadToFormData,
  VOICE_FIELD_CONFIG,
  VoiceFieldConfig,
  VoiceIntakePayload,
} from '../utils/voiceReportMapper';
import { getRealtimeSessionEndpoint } from '../utils/env';

type AssistantStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'summary'
  | 'saving'
  | 'saved'
  | 'error';

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface VoiceMigraineAssistantProps {
  onCancel: () => void;
  onClose: () => void;
  onSaved?: () => void;
}

interface EphemeralSession {
  id: string;
  clientSecret: string;
  expiresAt?: number;
  model?: string;
  voice?: string;
}

const buildSystemPrompt = () => `
You are Dr. Ease, a professional but warm migraine intake specialist helping someone log a migraine.

Communication principles:
- Listen closely and only ask about details that have not been provided yet.
- Do NOT repeat or reconfirm data that the patient already stated unless they contradict themselves.
- If information is unclear, ask one short clarifying question; if they still do not know, mark the value as "unknown" (or false) and move on so the intake stays efficient.
- Keep the tone calm, clinical, and supportive. Speak in concise sentences (under ~18 words).

Metadata protocol (never spoken aloud):
- After you verbally acknowledge a new fact, append [[FIELD|fieldName|value]] to the text transcript so the interface stays in sync. These tokens must not be part of the spoken audio.
- When you are ready to save, give a brief natural-language summary (max 4 sentences). Immediately after that summary, append [[REPORT|{...json...}]] with STRICT JSON (double quotes). Do not read or describe the JSON.
- Emit the REPORT token only once per session.

If certain fields remain unknown after reasonable attempts, set them to "unknown", false, or an empty list and continue. Never loop endlessly trying to fill a field.
`;

const useStableCallback = <T extends (...args: any[]) => any>(callback: T) => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => callbackRef.current(...args), []);
};

export function VoiceMigraineAssistant({
  onCancel,
  onClose,
  onSaved,
}: VoiceMigraineAssistantProps) {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [collectedData, setCollectedData] = useState<Partial<MigraineReportFormData>>({
    onsetDate: new Date(),
    auraPresent: false,
    symptoms: [],
    triggers: [],
  });
  const [structuredReport, setStructuredReport] = useState<MigraineReportFormData | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const assistantBuffers = useRef<Record<string, string>>({});
  const metadataBuffer = useRef('');

  const missingFields = useMemo(
    () => getMissingFields(collectedData),
    [collectedData]
  );

  const readyForSummary = missingFields.length === 0 && !structuredReport;

  const appendTranscript = useCallback((message: TranscriptMessage) => {
    setTranscript(prev => [...prev, message]);
  }, []);

  const processAssistantText = useCallback(
    (responseId: string) => {
      const raw = assistantBuffers.current[responseId];
      if (!raw) return;
      delete assistantBuffers.current[responseId];

      const { text, fieldUpdates, report } = extractVoiceAssistantMetadata(raw);

      if (text) {
        appendTranscript({
          id: responseId,
          role: 'assistant',
          text,
          timestamp: Date.now(),
        });
      }

      let nextData = collectedData;

      if (fieldUpdates.length) {
        nextData = fieldUpdates.reduce(
          (acc, update) => applyVoiceFieldUpdate(acc, update.field, update.value),
          nextData
        );
        setCollectedData(nextData);
      }

      if (report) {
        const normalized = mapVoicePayloadToFormData(report, nextData);
        setCollectedData(normalized);
        setStructuredReport(normalized);
        setStatus('summary');
      }
    },
    [appendTranscript, collectedData]
  );

  const handleDataChannelMessage = useStableCallback((event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data);
      switch (payload.type) {
        case 'response.output_text.delta': {
          const { response_id: responseId, delta } = payload;
          assistantBuffers.current[responseId] = `${
            assistantBuffers.current[responseId] ?? ''
          }${delta}`;
          break;
        }
        case 'response.output_text.done': {
          processAssistantText(payload.response_id);
          break;
        }
        case 'conversation.item.input_audio_transcription.completed': {
          if (payload.transcript) {
            appendTranscript({
              id: payload.item_id,
              role: 'user',
              text: payload.transcript,
              timestamp: Date.now(),
            });
          }
          break;
        }
        case 'response.completed': {
          processAssistantText(payload.response?.id ?? payload.response_id);
          break;
        }
        case 'response.error':
        case 'error': {
          setError(payload.error?.message || 'Voice assistant error');
          setStatus('error');
          break;
        }
        default:
          break;
      }
    } catch (err) {
      metadataBuffer.current += ` ${event.data}`;
      const metadataMatch = /\[\[REPORT\|(.*?)\]\]/.exec(metadataBuffer.current);
      if (metadataMatch) {
        try {
          const payload = JSON.parse(metadataMatch[1]) as VoiceIntakePayload;
          const normalized = mapVoicePayloadToFormData(payload, collectedData);
          setCollectedData(normalized);
          setStructuredReport(normalized);
          setStatus('summary');
        } catch (error) {
          console.warn('[VoiceAssistant] Failed to parse fallback report payload', error);
        } finally {
          metadataBuffer.current = '';
        }
      }
    }
  });

  const fetchSession = async (): Promise<EphemeralSession> => {
    const endpoint = getRealtimeSessionEndpoint();
    const response = await fetch(endpoint, {
      method: 'POST',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Failed to start voice assistant.');
    }

    const data = (await response.json()) as EphemeralSession;
    if (!data.clientSecret) {
      throw new Error('Realtime session is missing client secret.');
    }
    return data;
  };

  const teardownSession = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      teardownSession();
    };
  }, [teardownSession]);

  const startListening = async () => {
    setError(null);
    setStatus('connecting');
    setStructuredReport(null);
    setTranscript([]);
    setCollectedData({
      onsetDate: new Date(),
      auraPresent: false,
      symptoms: [],
      triggers: [],
    });
    assistantBuffers.current = {};
    metadataBuffer.current = '';

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not available in this browser.');
      }

      const session = await fetchSession();
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      peerConnectionRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      localStreamRef.current = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = event => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Connection lost. Tap reconnect to continue.');
          setStatus('error');
          teardownSession();
        }
      };

      const dataChannel = pc.createDataChannel('oai-events');
      dataChannelRef.current = dataChannel;
      dataChannel.onmessage = handleDataChannelMessage;
      dataChannel.onopen = () => {
        setStatus('listening');
        dataChannel.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              instructions: buildSystemPrompt(),
              voice: session.voice ?? 'alloy',
              modalities: ['audio', 'text'],
            },
          })
        );
        dataChannel.send(JSON.stringify({ type: 'response.create' }));
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = session.model ?? 'gpt-4o-realtime-preview';
      const rtcResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp ?? '',
        headers: {
          Authorization: `Bearer ${session.clientSecret}`,
          'Content-Type': 'application/sdp',
        },
      });

      const answer = {
        type: 'answer',
        sdp: await rtcResponse.text(),
      } as RTCSessionDescriptionInit;

      await pc.setRemoteDescription(answer);
    } catch (err) {
      console.error('[VoiceAssistant] Failed to start session', err);
      setError(
        err instanceof Error ? err.message : 'Unable to start the voice assistant right now.'
      );
      setStatus('error');
      teardownSession();
    }
  };

  const stopListening = () => {
    teardownSession();
    setStatus('idle');
  };

  const requestFinalSummary = () => {
    if (!dataChannelRef.current) {
      return;
    }
    setIsFinalizing(true);
    dataChannelRef.current.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Please confirm the details collected and emit the final REPORT token so we can save the migraine record.',
            },
          ],
        },
      })
    );
    dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }));
    setTimeout(() => setIsFinalizing(false), 1500);
  };

  const saveReport = async () => {
    if (!structuredReport) return;
    setIsSaving(true);
    setError(null);
    setStatus('saving');

    try {
      const service = getMigraineService();
      await service.createReport(structuredReport);
      setStatus('saved');
      onSaved?.();
      setTimeout(() => {
        stopListening();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('[VoiceAssistant] Failed to save report', err);
      setError('Unable to save the migraine report. Please try again.');
      setStatus('summary');
    } finally {
      setIsSaving(false);
    }
  };

  const formatFieldValue = useCallback(
    (field: VoiceFieldConfig, data: Partial<MigraineReportFormData>) => {
      const value = data[field.id];
      if (field.id === 'onsetDate' && value instanceof Date) {
        return value.toLocaleString();
      }
      if (Array.isArray(value)) {
        return value.length ? value.join(', ') : 'Pending';
      }
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      if (value === undefined || value === '') {
        return 'Pending';
      }
      return `${value}`;
    },
    []
  );

  const statusLabel = (() => {
    switch (status) {
      case 'idle':
        return 'Ready to begin';
      case 'connecting':
        return 'Connecting to clinician';
      case 'listening':
        return 'Listening';
      case 'summary':
        return 'Ready for confirmation';
      case 'saving':
        return 'Saving report';
      case 'saved':
        return 'Report saved';
      case 'error':
        return 'Connection issue';
      default:
        return 'Idle';
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopListening();
              onCancel();
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Options
          </Button>
          <div>
            <p className="text-sm font-semibold text-primary">Voice intake</p>
            <h1 className="text-h2">Speak with Dr. Ease</h1>
            <p className="text-sm text-muted-foreground">
              Professional, friendly guidance through your migraine report.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            stopListening();
            onClose();
          }}
        >
          Close
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid w-full gap-6 p-6 lg:grid-cols-[2fr,1fr]">
          <section className="flex flex-col rounded-3xl border border-border bg-card/60 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={status === 'error' ? 'destructive' : 'secondary'}>
                  {statusLabel}
                </Badge>
                {status === 'listening' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Volume2 className="h-4 w-4" />
                    Speak naturally - the assistant is listening.
                  </div>
                )}
              </div>
              <audio ref={audioRef} autoPlay hidden />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {status === 'listening' ? (
                <Button size="lg" variant="destructive" onClick={stopListening}>
                  <Square className="mr-2 h-4 w-4" />
                  Pause intake
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={startListening}
                  disabled={status === 'connecting'}
                >
                  {status === 'connecting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Start voice intake
                    </>
                  )}
                </Button>
              )}
              {status === 'error' && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={startListening}
                  className="gap-2"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reconnect
                </Button>
              )}
            </div>

            <div className="mt-8 flex-1 overflow-hidden rounded-2xl bg-background/80 border border-border">
              <div className="h-[320px] overflow-y-auto p-6 space-y-4">
                {transcript.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    When you begin, every exchange will appear here for reference.
                  </p>
                )}
                {transcript.map(message => (
                  <div
                    key={message.id}
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'assistant'
                        ? 'bg-primary/10 text-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      {message.role === 'assistant' ? 'Dr. Ease' : 'You'}
                    </p>
                    <p className="text-body">{message.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-6 rounded-3xl border border-border bg-card/60 p-6">
            <div>
              <h3 className="text-h3">Clinical checklist</h3>
              <p className="text-sm text-muted-foreground">
                Each item must be confirmed before we can save your report.
              </p>
            </div>
            <div className="space-y-3">
              {VOICE_FIELD_CONFIG.map(field => {
                const missing = missingFields.some(item => item.id === field.id);
                const value = formatFieldValue(field, collectedData);
                return (
                  <div
                    key={field.id}
                    className="flex items-start justify-between rounded-2xl border border-border/60 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{field.label}</p>
                      <p className="text-xs text-muted-foreground">{value}</p>
                    </div>
                    {missing ? (
                      <Badge variant="secondary">Pending</Badge>
                    ) : (
                      <Badge className="bg-success/10 text-success">Captured</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 rounded-2xl border border-border/60 p-4">
              <h4 className="text-h4">Status</h4>
              {structuredReport ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-sm font-semibold">Ready to save</p>
                  </div>
                  <Button
                    size="lg"
                    onClick={saveReport}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save migraine report
                      </>
                    )}
                  </Button>
                  {status === 'saved' && (
                    <p className="text-sm text-muted-foreground">
                      Report saved. Closing the assistant…
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {readyForSummary
                      ? 'All data captured. Ask the assistant to confirm and finalize.'
                      : 'The assistant will keep asking brief questions until every item is captured.'}
                  </p>
                  {readyForSummary && (
                    <Button
                      variant="outline"
                      onClick={requestFinalSummary}
                      disabled={isFinalizing}
                      className="gap-2"
                    >
                      {isFinalizing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Waiting for summary
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" />
                          Ask for confirmation
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
