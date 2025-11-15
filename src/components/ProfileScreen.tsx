import React, { useState } from 'react';
import {
  ChevronRight,
  User,
  Smartphone,
  Bell,
  Share2,
  Shield,
  Info,
  Download,
  Trash2,
  Server,
  Moon,
  Clock,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { BottomNav } from './BottomNav';
import { AccessibleSwitch } from './ui/accessible-switch';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ShareWithClinicianFlow } from './ShareWithClinicianFlow';

interface ProfileScreenProps {
  onBack?: () => void;
  onNavigate?: (tab: 'home' | 'diary' | 'profile') => void;
  onDevicesClick?: () => void;
}

export function ProfileScreen({ onBack, onNavigate, onDevicesClick }: ProfileScreenProps) {
  const [lowStimMode, setLowStimMode] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [lowStimWarnings, setLowStimWarnings] = useState(true);
  const [onDeviceModel, setOnDeviceModel] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareFlow, setShowShareFlow] = useState(false);

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3">
        <h1 className="text-center">Profile</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Low-stimulation mode - Prominent at top */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-indigo-100">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Moon className="w-5 h-5 text-[#6A67D8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">
                    Low-stimulation mode
                  </div>
                  <div className="text-sm text-gray-600">
                    Reduce animations & visual density
                  </div>
                </div>
              </div>
              <AccessibleSwitch
                checked={lowStimMode}
                onCheckedChange={setLowStimMode}
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-6">
          {/* Account Section */}
          <section>
            <h2 className="text-sm text-gray-500 mb-3 px-1">Account</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16">
                  <AvatarImage src="" alt="Profile" />
                  <AvatarFallback className="bg-[#6A67D8] text-white">
                    SK
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">Sarah Kim</div>
                  <div className="text-sm text-gray-600">sarah.kim@email.com</div>
                </div>
                <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </section>

          {/* Devices & Data Sources */}
          <section>
            <h2 className="text-sm text-gray-500 mb-3 px-1">
              Devices & data sources
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-5 h-5 text-[#6A67D8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        Connected devices
                      </div>
                      <div className="text-sm text-gray-600">
                        3 sources active
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    Syncing
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-gray-700">Apple Health</span>
                    <span className="text-gray-400">· Last sync 5m ago</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-gray-700">Fitbit</span>
                    <span className="text-gray-400">· Last sync 12m ago</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-gray-700">Calendar</span>
                    <span className="text-gray-400">· Last sync 1m ago</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onDevicesClick}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                style={{ minHeight: '44px' }}
              >
                <span className="text-[#6A67D8]">Manage connections</span>
                <ChevronRight className="w-5 h-5 text-[#6A67D8]" />
              </button>
            </div>
          </section>

          {/* Alerts & Nudges */}
          <section>
            <h2 className="text-sm text-gray-500 mb-3 px-1">Alerts & nudges</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Quiet Hours */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        Quiet hours
                      </div>
                      <div className="text-sm text-gray-600">
                        10:00 PM – 8:00 AM
                      </div>
                    </div>
                  </div>
                  <AccessibleSwitch
                    checked={quietHours}
                    onCheckedChange={setQuietHours}
                  />
                </div>
              </div>

              {/* Sensitivity Level */}
              <button className="w-full p-4 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Bell className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      Alert sensitivity
                    </div>
                    <div className="text-sm text-gray-600">Medium</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Low-stim warnings only */}
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Moon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        Low-stimulation warnings only
                      </div>
                      <div className="text-sm text-gray-600">
                        Gentle notifications without sound
                      </div>
                    </div>
                  </div>
                  <AccessibleSwitch
                    checked={lowStimWarnings}
                    onCheckedChange={setLowStimWarnings}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Sharing */}
          <section>
            <h2 className="text-sm text-gray-500 mb-3 px-1">Sharing</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-5 h-5 text-[#6A67D8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 mb-1">
                      Share with doctor or caregiver
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      Generate a secure, time-bound link to share your migraine
                      patterns and predictions.
                    </div>
                    <Button
                      onClick={() => setShowShareFlow(true)}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Generate secure link
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active shares */}
              <div className="p-4">
                <div className="text-sm text-gray-500 mb-3">Active shares</div>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        Dr. Emily Chen
                      </div>
                      <div className="text-sm text-gray-600">
                        Expires in 27 days
                      </div>
                    </div>
                    <button className="text-sm text-red-600 hover:text-red-700">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-sm text-gray-500 mb-3 px-1">Privacy</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* On-device model */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Server className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        On-device prediction model
                      </div>
                      <div className="text-sm text-gray-600">
                        Your data never leaves your device
                      </div>
                    </div>
                  </div>
                  <AccessibleSwitch
                    checked={onDeviceModel}
                    onCheckedChange={setOnDeviceModel}
                  />
                </div>
              </div>

              {/* Download data */}
              <button className="w-full p-4 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    Download my data
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Delete data */}
              <button className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-600">
                    Delete all my data
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-sm text-gray-500 mb-3 px-1">About</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Disclaimer */}
              <button className="w-full p-4 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    Medical disclaimer
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Version */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">Version</span>
                </div>
                <span className="text-sm text-gray-600">v0.1.0</span>
              </div>
            </div>
          </section>

          {/* Attribution */}
          <div className="text-center py-4">
            <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto">
              <span>Open source licenses</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab="profile" 
        onNavigate={onNavigate || ((tab) => tab === 'home' && onBack?.())} 
      />

      {/* Share with Clinician Flow Modal */}
      {showShareFlow && (
        <ShareWithClinicianFlow onClose={() => setShowShareFlow(false)} />
      )}
    </div>
  );
}
