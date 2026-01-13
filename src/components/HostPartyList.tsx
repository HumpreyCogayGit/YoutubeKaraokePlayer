import { useState, useEffect } from 'react';
import { partyAPI, Party, PartyMember } from '../api/party';
import QRCode from 'qrcode';

interface HostPartyListProps {
  onSelectParty: (party: Party) => void;
}

const HostPartyList = ({ onSelectParty }: HostPartyListProps) => {
  const [hostParty, setHostParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [showMemberTooltip, setShowMemberTooltip] = useState(false);

  useEffect(() => {
    loadHostParty();
    
    // Refresh every 30 seconds to avoid rate limiting
    const interval = setInterval(loadHostParty, 30000);
    
    // Listen for immediate refresh events
    const handlePartyUpdate = () => {
      loadHostParty();
    };
    window.addEventListener('party-updated', handlePartyUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('party-updated', handlePartyUpdate);
    };
  }, []);

  useEffect(() => {
    if (hostParty) {
      generateQRCode();
    }
  }, [hostParty]);

  const loadHostParty = async () => {
    try {
      const parties = await partyAPI.getMyParties();
      // Get the first party (host can only have one)
      const party = parties.length > 0 ? parties[0] : null;
      setHostParty(party);
      
      // Load members if party exists
      if (party) {
        try {
          const partyMembers = await partyAPI.getPartyMembers(party.id);
          setMembers(partyMembers);
        } catch (err) {
          console.error('Failed to load party members:', err);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load host party:', err);
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!hostParty) return;
    try {
      const joinUrl = `${window.location.origin}?party=${hostParty.code}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  if (!hostParty && !loading) {
    return null;
  }

  if (loading || !hostParty) {
    return (
      <div className="bg-[#10b981] rounded-lg p-4 shadow-lg border-2 border-emerald-400">
        <div className="flex items-center justify-center py-8">
          <div className="text-white">Loading party...</div>
        </div>
      </div>
    );
  }

  // At this point, hostParty is guaranteed to be non-null
  return (
    <div className="bg-[#10b981] rounded-lg p-4 shadow-lg border-2 border-emerald-400">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          {hostParty.name}
          <span className="text-xs bg-emerald-600 px-2 py-1 rounded-full">HOST</span>
        </h3>
      </div>

      <div className="flex gap-4">
        {/* QR Code */}
        {qrCodeUrl && (
          <div className="flex-shrink-0">
            <img 
              src={qrCodeUrl} 
              alt="Party QR Code" 
              className="w-32 h-32 bg-white p-2 rounded"
            />
            <p className="text-xs text-emerald-100 text-center mt-1">Scan to join</p>
          </div>
        )}

        {/* Party Info */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="mb-3">
            <p className="text-emerald-100 text-xs mb-1">Party Code</p>
            <div className="font-mono text-2xl font-bold text-white bg-emerald-700 px-3 py-2 rounded text-center">
              {hostParty.code}
            </div>
          </div>
          
          <div className="flex justify-between text-sm">
            <div 
              className="text-white relative cursor-pointer"
              onMouseEnter={() => setShowMemberTooltip(true)}
              onMouseLeave={() => setShowMemberTooltip(false)}
            >
              <span className="font-semibold">{hostParty.member_count || 0}</span> members
              {showMemberTooltip && members.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-900 border border-emerald-500 rounded-lg p-3 shadow-xl z-50 min-w-48">
                  <div className="text-emerald-300 text-xs font-bold mb-2">Party Members</div>
                  <div className="space-y-1">
                    {members.map((member, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <img 
                          src={member.profile_picture} 
                          alt={member.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-white text-xs">{member.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-white">
              <span className="font-semibold">{hostParty.pending_songs || 0}</span> songs
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onSelectParty(hostParty)}
        className="w-full mt-3 bg-emerald-700 hover:bg-emerald-600 text-white py-2 px-4 rounded-lg font-semibold transition-all"
      >
        Manage Party
      </button>
    </div>
  );
};

export default HostPartyList;
