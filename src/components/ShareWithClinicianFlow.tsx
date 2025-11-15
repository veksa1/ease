import React, { useState } from 'react';
import {
  X,
  Calendar,
  Activity,
  FileText,
  TrendingUp,
  Check,
  Copy,
  Mail,
  Share2,
  Shield,
  Clock,
  Info,
  ChevronRight,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { SegmentedControl } from './SegmentedControl';

interface ShareWithClinicianFlowProps {
  onClose: () => void;
}

type Timeframe = '30' | '90';
type ContentType = 'predictions' | 'attacks' | 'correlations';

export function ShareWithClinicianFlow({ onClose }: ShareWithClinicianFlowProps) {
  const [step, setStep] = useState<'configure' | 'generated'>('configure');
  const [timeframe, setTimeframe] = useState<Timeframe>('30');
  const [selectedContent, setSelectedContent] = useState<ContentType[]>([
    'predictions',
    'attacks',
    'correlations',
  ]);
  const [linkCopied, setLinkCopied] = useState(false);

  const toggleContent = (content: ContentType) => {
    setSelectedContent((prev) =>
      prev.includes(content)
        ? prev.filter((c) => c !== content)
        : [...prev, content]
    );
  };

  const handleGenerateLink = () => {
    setStep('generated');
  };

  const handleCopyLink = () => {
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleEmailLink = () => {
    // Mock email functionality
    alert('Email dialog would open here');
  };

  // Mock secure link
  const secureLink = 'https://ease.health/share/abc123xyz';

  const contentOptions = [
    {
      id: 'predictions' as ContentType,
      icon: TrendingUp,
      title: 'Migraine predictions',
      description: 'AI-predicted risk levels and patterns',
    },
    {
      id: 'attacks' as ContentType,
      icon: Activity,
      title: 'Attack logs',
      description: 'Detailed migraine episodes and symptoms',
    },
    {
      id: 'correlations' as ContentType,
      icon: FileText,
      title: 'Health correlations',
      description: 'Sleep, HRV, triggers, and environmental factors',
    },
  ];

  if (step === 'generated') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-h2">Share with Dr. Ease</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Success Message */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-h2">Secure link generated</h3>
              <p className="text-body text-gray-600">
                Share this link with your healthcare provider
              </p>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 flex flex-col items-center">
              <div className="w-48 h-48 bg-white rounded-xl border border-gray-200 flex items-center justify-center mb-4 p-4">
                <QRCodeSVG
                  value={secureLink}
                  size={176}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Scan with camera to open link
              </p>
            </div>

            {/* Link with Copy/Email Actions */}
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Secure link
                  </span>
                </div>
                <p className="text-sm text-gray-600 break-all font-mono">
                  {secureLink}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="h-12 rounded-xl"
                  style={{ borderRadius: '12px' }}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy link
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleEmailLink}
                  variant="outline"
                  className="h-12 rounded-xl"
                  style={{ borderRadius: '12px' }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>

            {/* Preview of Shared Content */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-gray-600" />
                <h4 className="font-medium text-gray-900">What's included</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Last {timeframe} days of data</span>
                </div>
                {selectedContent.map((contentId) => {
                  const content = contentOptions.find((c) => c.id === contentId);
                  if (!content) return null;
                  const Icon = content.icon;
                  return (
                    <div key={contentId} className="flex items-center gap-2 text-sm text-gray-700">
                      <Icon className="w-4 h-4 text-indigo-600" />
                      <span>{content.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Access Details */}
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <h4 className="font-medium text-gray-900">
                    Time-limited access
                  </h4>
                  <p className="text-sm text-gray-600">
                    This link expires in 30 days and can be revoked anytime from
                    your profile settings.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Note */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <h4 className="font-medium text-gray-900">Privacy reminder</h4>
                  <p className="text-sm text-gray-600">
                    Only share this link with trusted healthcare professionals.
                    Your data is encrypted and view-only. Recipients cannot modify
                    or download your information.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={onClose}
              className="w-full h-12 rounded-xl"
              style={{ borderRadius: '12px' }}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Configure step
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Share with Dr. Ease</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Introduction */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <Share2 className="w-8 h-8 text-[#6A67D8]" />
            </div>
            <p className="text-body text-gray-600">
              Generate a secure, time-bound link to share your migraine patterns
              with healthcare providers.
            </p>
          </div>

          {/* Timeframe Selection */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Select timeframe
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setTimeframe('30')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  timeframe === '30'
                    ? 'border-[#6A67D8] bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={{ borderRadius: '12px' }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Last 30 days</div>
                    <div className="text-sm text-gray-600">Recent patterns</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      timeframe === '30'
                        ? 'border-[#6A67D8] bg-[#6A67D8]'
                        : 'border-gray-300'
                    }`}
                  >
                    {timeframe === '30' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTimeframe('90')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  timeframe === '90'
                    ? 'border-[#6A67D8] bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={{ borderRadius: '12px' }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Last 90 days</div>
                    <div className="text-sm text-gray-600">
                      Comprehensive history
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      timeframe === '90'
                        ? 'border-[#6A67D8] bg-[#6A67D8]'
                        : 'border-gray-300'
                    }`}
                  >
                    {timeframe === '90' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Content Selection */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Choose what to share
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {contentOptions.map((content, index) => {
                const Icon = content.icon;
                const isSelected = selectedContent.includes(content.id);
                return (
                  <React.Fragment key={content.id}>
                    {index > 0 && <div className="border-t border-gray-100" />}
                    <button
                      onClick={() => toggleContent(content.id)}
                      className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleContent(content.id)}
                          className="pointer-events-none"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-[#6A67D8]" />
                          <span className="font-medium text-gray-900">
                            {content.title}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {content.description}
                        </p>
                      </div>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Preview Card */}
          {selectedContent.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#6A67D8] flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium text-gray-900">
                    Preview of shared data
                  </h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>• {timeframe} days of selected health information</div>
                    <div>• {selectedContent.length} data categories included</div>
                    <div>• View-only access, expires in 30 days</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  Your privacy is protected
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Data is encrypted end-to-end</li>
                  <li>• Access expires automatically in 30 days</li>
                  <li>• You can revoke access anytime</li>
                  <li>• Recipients cannot download or modify data</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateLink}
            disabled={selectedContent.length === 0}
            className="w-full h-12 rounded-xl"
            style={{ borderRadius: '12px' }}
          >
            Generate secure link
          </Button>

          {selectedContent.length === 0 && (
            <p className="text-sm text-red-600 text-center -mt-3">
              Please select at least one data category to share
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
