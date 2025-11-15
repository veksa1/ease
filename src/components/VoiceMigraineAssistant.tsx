import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Loader2,
  Volume2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
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
  mapVoicePayloadToFormData,
  VoiceIntakePayload,
} from '../utils/voiceReportMapper';
import { getRealtimeSessionEndpoint } from '../utils/env';

const MIGRAINE_TOOL_NAME = 'save_migraine_report';
const MIGRAINE_TOOL_SCHEMA = {
  type: 'function',
  name: MIGRAINE_TOOL_NAME,
  description:
    'Call this when you have gathered enough information to populate the migraine report form. ' +
    'Provide all details you know; leave a field null or "unknown" if the patient is uncertain.',
  parameters: {
    type: 'object',
    properties: {
      onsetDate: {
        type: 'string',
        description: 'ISO 8601 timestamp describing when the migraine began.',
      },
      durationHours: {
        type: 'number',
        description: 'Approximate duration of the migraine in hours.',
      },
      severity: {
        type: 'number',
        description: 'Pain severity on a 0-10 scale.',
      },
      auraPresent: {
        type: 'boolean',
        description: 'Whether the patient experienced an aura.',
      },
      auraTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['visual', 'sensory', 'speech', 'motor'],
        },
      },
      painCharacter: {
        type: 'string',
        enum: ['throbbing', 'stabbing', 'pressure', 'other'],
      },
      symptoms: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of accompanying symptoms.',
      },
      triggers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Possible triggers the patient mentioned.',
      },
      otherTriggerNotes: { type: 'string' },
      notes: { type: 'string' },
      medicationTaken: { type: 'string' },
      medicationTiming: {
        type: 'string',
        enum: ['0-1h', '1-3h', '3-6h', '>6h'],
      },
      reliefLevel: {
        type: 'string',
        enum: ['none', 'partial', 'good'],
      },
      impactMissedWork: { type: 'boolean' },
      impactHadToRest: { type: 'boolean' },
      impactScore: { type: 'number' },
    },
    required: ['onsetDate', 'severity', 'symptoms', 'triggers'],
  },
} as const;

const AUDIO_POST_BUFFER_GRACE_MS = 600;
const AUDIO_FALLBACK_TIMEOUT_MS = 3000;
const COMPLETION_TRANSITION_DELAY_MS = 1200;

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
- Start the conversation by greeting the patient and immediately asking them to describe the current migraine onset, timing, and first symptoms in their own words.
- Whenever the patient responds, acknowledge that you heard them with a brief empathetic cue such as "I understand", "Okay, thank you", or "That makes sense" before moving to the next question.
- Listen closely and only ask about details that have not been provided yet.
- Do NOT repeat or reconfirm data that the patient already stated unless they contradict themselves.
- If information is unclear, ask one short clarifying question; if they still do not know, mark the value as "unknown" (or false) and move on so the intake stays efficient.
- Keep the tone calm, clinical, and supportive. Speak in concise sentences (under ~18 words).
- After hearing an answer, do not respond with a confirmation repeating what they said. Instead, move on to the next missing item.
- When the report is complete, simply say one short line such as "Thank you, I'm saving this now." Do not read details, summaries, or JSON aloud.

Metadata protocol (never spoken aloud):
- After you verbally acknowledge a new fact, append [[FIELD|fieldName|value]] to the text transcript so the interface stays in sync. These tokens must not be part of the spoken audio.
- Once every required field is captured, simply thank the patient and let them know you are saving the report now. Immediately after that spoken thank you, append [[REPORT|{...json...}]] with STRICT JSON (double quotes). Do not read or describe the JSON.
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
  const [isSaving, setIsSaving] = useState(false);
  const [lastUserSpeechAt, setLastUserSpeechAt] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const assistantBuffers = useRef<Record<string, string>>({});
  const metadataBuffer = useRef('');
  const pendingTeardownAfterAudio = useRef(false);
  const audioGraceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCompletionClose = useRef(false);
  const processedFunctionCallIds = useRef<Set<string>>(new Set());

  const clearAudioCompletionTimers = useCallback(() => {
    if (audioGraceTimeoutRef.current) {
      clearTimeout(audioGraceTimeoutRef.current);
      audioGraceTimeoutRef.current = null;
    }
    if (audioFallbackTimeoutRef.current) {
      clearTimeout(audioFallbackTimeoutRef.current);
      audioFallbackTimeoutRef.current = null;
    }
  }, []);

  const resetCompletionFlow = useCallback(() => {
    pendingCompletionClose.current = false;
    if (completionDelayTimeoutRef.current) {
      clearTimeout(completionDelayTimeoutRef.current);
      completionDelayTimeoutRef.current = null;
    }
  }, []);

  const maybeCloseAfterCalm = useCallback(() => {
    if (!pendingCompletionClose.current || completionDelayTimeoutRef.current) {
      return;
    }
    completionDelayTimeoutRef.current = setTimeout(() => {
      pendingCompletionClose.current = false;
      completionDelayTimeoutRef.current = null;
      onSaved?.();
    }, COMPLETION_TRANSITION_DELAY_MS);
  }, [onSaved]);

  const teardownSession = useCallback(() => {
    clearAudioCompletionTimers();
    pendingTeardownAfterAudio.current = false;
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (pendingCompletionClose.current) {
      maybeCloseAfterCalm();
    } else {
      resetCompletionFlow();
    }
  }, [clearAudioCompletionTimers, maybeCloseAfterCalm, resetCompletionFlow]);

  const stopListening = useCallback(() => {
    teardownSession();
    setStatus('idle');
  }, [teardownSession]);

  const hasUserInput = transcript.some(message => message.role === 'user');

  const appendTranscript = useCallback((message: TranscriptMessage) => {
    setTranscript(prev => [...prev, message]);
  }, []);

  const scheduleTeardownAfterAudio = useCallback(
    (delayMs: number) => {
      if (audioGraceTimeoutRef.current) {
        clearTimeout(audioGraceTimeoutRef.current);
      }
      audioGraceTimeoutRef.current = setTimeout(() => {
        audioGraceTimeoutRef.current = null;
        teardownSession();
      }, delayMs);
    },
    [teardownSession]
  );

  const saveReport = useCallback(
    async (
      override?: MigraineReportFormData,
      options?: {
        delayTeardown?: boolean;
      }
    ) => {
      const delayTeardown = options?.delayTeardown ?? false;
      setIsSaving(true);
      setError(null);
      setStatus('saving');

      try {
        const service = getMigraineService();
        const payload =
          override ?? structuredReport ?? finalizeFormDataFromPartial(collectedData);
        console.log('[VoiceMigraineAssistant] Saving report', payload);
        await service.createReport(payload);
        setStatus('saved');
        pendingCompletionClose.current = true;
        if (delayTeardown) {
          clearAudioCompletionTimers();
          pendingTeardownAfterAudio.current = true;
        } else {
          teardownSession();
        }
      } catch (err) {
        console.error('[VoiceAssistant] Failed to save report', err);
        setError('Unable to save the migraine report. Please try again.');
        setStatus('summary');
      } finally {
        setIsSaving(false);
      }
    },
    [structuredReport, collectedData, teardownSession, clearAudioCompletionTimers]
  );

  const handleFunctionCall = useCallback(
    async (functionPart: {
      name?: string;
      arguments?: string;
      call_id?: string;
      function?: { name?: string; arguments?: string; call_id?: string };
      id?: string;
    }) => {
      const partName = functionPart?.name ?? functionPart?.function?.name;
      if (partName !== MIGRAINE_TOOL_NAME) {
        console.debug('[VoiceAssistant] Unknown function call received', functionPart);
        return;
      }

      const callId =
        functionPart?.call_id ?? functionPart?.function?.call_id ?? functionPart?.id ?? '';
      if (callId && processedFunctionCallIds.current.has(callId)) {
        console.debug('[VoiceAssistant] Ignoring duplicate function call', callId);
        return;
      }
      if (callId) {
        processedFunctionCallIds.current.add(callId);
      }

      try {
        const argsPayload = functionPart?.arguments ?? functionPart?.function?.arguments;
        const args = argsPayload ? JSON.parse(argsPayload) : {};
        const normalized = mapVoicePayloadToFormData(args, collectedData);

        setCollectedData(normalized);
        setStructuredReport(normalized);
        setStatus('summary');

        await saveReport(normalized, { delayTeardown: true });

        if (callId) {
          dataChannelRef.current?.send(
            JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: 'Migraine report saved successfully.',
                  },
                ],
              },
            })
          );
        }
      } catch (error) {
        console.error('[VoiceAssistant] Failed to handle function call', error, functionPart);
      }
    },
    [collectedData, saveReport]
  );

  useEffect(() => {
    if (
      structuredReport ||
      !hasUserInput ||
      !lastUserSpeechAt ||
      status === 'saving' ||
      status === 'saved'
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      if (!structuredReport && hasUserInput) {
        const normalized = finalizeFormDataFromPartial(collectedData);
        setCollectedData(normalized);
        setStructuredReport(normalized);
        setLastUserSpeechAt(null);
        saveReport(normalized);
      }
    }, 12000);

    return () => clearTimeout(timeout);
  }, [hasUserInput, structuredReport, lastUserSpeechAt, collectedData, saveReport, status]);

  const processAssistantText = useCallback(
    (responseId: string) => {
      const raw = assistantBuffers.current[responseId];
      if (!raw) return;
      delete assistantBuffers.current[responseId];

      const { text, fieldUpdates, report } = extractVoiceAssistantMetadata(raw);

      if (text) {
        console.debug('[VoiceAssistant] assistant text chunk', raw);
        appendTranscript({
          id: responseId,
          role: 'assistant',
          text,
          timestamp: Date.now(),
        });
      }

      let nextData = collectedData;

      if (fieldUpdates.length) {
        console.debug('[VoiceAssistant] field updates', fieldUpdates);
        nextData = fieldUpdates.reduce(
          (acc, update) => applyVoiceFieldUpdate(acc, update.field, update.value),
          nextData
        );
        setCollectedData(nextData);
      }

      if (report) {
        console.debug('[VoiceAssistant] report payload', report);
        const normalized = mapVoicePayloadToFormData(report, nextData);
        setCollectedData(normalized);
        setStructuredReport(normalized);
        setStatus('summary');
        saveReport(normalized, { delayTeardown: true });
      }
    },
    [appendTranscript, collectedData, saveReport]
  );

  const handleDataChannelMessage = useStableCallback((event: MessageEvent<string>) => {
    // Surface every inbound data-channel payload so we can inspect the raw responses
    console.debug('[VoiceAssistant] raw event payload', event.data);
    try {
      const payload = JSON.parse(event.data);
      const processFunctionOutput = (output?: any[]) => {
        if (!output) return;
        output.forEach((item: any) => {
          if (!item) return;
          if (item.type === 'function_call') {
            handleFunctionCall(item);
            return;
          }
          if (Array.isArray(item.content)) {
            item.content.forEach((part: any) => {
              if (part?.type === 'function_call') {
                handleFunctionCall(part);
              }
            });
          }
        });
      };

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
        case 'response.output_item.added':
        case 'response.output_item.done': {
          if (payload?.item) {
            processFunctionOutput([payload.item]);
          }
          break;
        }
        case 'response.content_part.added': {
          const part = payload.part;
          if (part?.type === 'function_call') {
            handleFunctionCall(part);
          }
          break;
        }
        case 'response.audio.done': {
          if (pendingTeardownAfterAudio.current && !audioFallbackTimeoutRef.current) {
            audioFallbackTimeoutRef.current = setTimeout(() => {
              audioFallbackTimeoutRef.current = null;
              if (!pendingTeardownAfterAudio.current) return;
              pendingTeardownAfterAudio.current = false;
              scheduleTeardownAfterAudio(AUDIO_POST_BUFFER_GRACE_MS);
            }, AUDIO_FALLBACK_TIMEOUT_MS);
          }
          break;
        }
        case 'output_audio_buffer.stopped': {
          if (pendingTeardownAfterAudio.current) {
            pendingTeardownAfterAudio.current = false;
            if (audioFallbackTimeoutRef.current) {
              clearTimeout(audioFallbackTimeoutRef.current);
              audioFallbackTimeoutRef.current = null;
            }
            scheduleTeardownAfterAudio(AUDIO_POST_BUFFER_GRACE_MS);
          }
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
            setLastUserSpeechAt(Date.now());

            dataChannelRef.current?.send(JSON.stringify({ type: 'response.create' }));
          }
          break;
        }
        case 'response.completed': {
          processAssistantText(payload.response?.id ?? payload.response_id);
          processFunctionOutput(payload.response?.output);
          break;
        }
        case 'response.error':
        case 'error': {
          const errMessage = payload.error?.message || 'Voice assistant error';
          const errCode = payload.error?.code;
          if (
            errCode === 'response_already_in_progress' ||
            errMessage.toLowerCase().includes('active response in progress')
          ) {
            console.debug('[VoiceAssistant] Ignoring benign response error', payload);
            break;
          }
          setError(errMessage);
          setStatus('error');
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.warn('[VoiceAssistant] Failed to parse event payload as JSON', err, event.data);
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
    setLastUserSpeechAt(null);
    pendingTeardownAfterAudio.current = false;
    resetCompletionFlow();
    processedFunctionCallIds.current.clear();
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
              tools: [MIGRAINE_TOOL_SCHEMA],
              tool_choice: 'auto',
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

  const statusLabel = (() => {
    switch (status) {
      case 'idle':
        return 'Ready to begin';
      case 'connecting':
        return 'Connecting to Dr. Ease';
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
        <div className="mx-auto w-full max-w-3xl p-6">
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
        </div>
      </div>

      {(status === 'saving' || status === 'saved') && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/75 px-6 backdrop-blur-sm">
          <div
            className="pointer-events-auto w-full max-w-sm flex flex-col items-center gap-3 rounded-3xl bg-card/95 px-6 py-6 text-center shadow-lg"
            role="status"
            aria-live="polite"
          >
            {status === 'saving' ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-success" />
            )}
            <p className="text-h4 text-balance">
              {status === 'saving' ? 'Saving your report' : 'Report saved'}
            </p>
            <p className="text-sm text-muted-foreground text-pretty">
              {status === 'saving'
                ? 'Stay relaxed while we sync everything securely.'
                : 'Dr. Ease is wrapping up. You will return shortly.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
