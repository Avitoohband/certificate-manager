import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Key, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import { certificatesApi } from '../services/api';
import { CertificateStatus } from '../types';

export default function CertificateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revocationReason, setRevocationReason] = useState('');

  const { data: certificate, isLoading } = useQuery({
    queryKey: ['certificate', id],
    queryFn: () => certificatesApi.getById(id!),
    enabled: !!id,
  });

  const { data: privateKeyData } = useQuery({
    queryKey: ['private-key', id],
    queryFn: () => certificatesApi.getPrivateKey(id!),
    enabled: showPrivateKey && !!id,
  });

  const renewMutation = useMutation({
    mutationFn: () => certificatesApi.renew(id!),
    onSuccess: (newCert) => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      navigate(`/certificates/${newCert.id}`);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => certificatesApi.revoke(id!, revocationReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate', id] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setShowRevokeModal(false);
    },
  });

  const handleDownload = async () => {
    const data = await certificatesApi.download(id!);
    const blob = new Blob([data.certificate], { type: 'application/x-pem-file' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${certificate?.commonName}-${data.serialNumber}.pem`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Certificate not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/certificates')} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{certificate.commonName}</h1>
            <p className="text-gray-500 text-sm mt-1">Serial: {certificate.serialNumber}</p>
          </div>
        </div>
        <StatusBadge status={certificate.status} />
      </div>

      {/* Warning for expiring/expired */}
      {certificate.status === CertificateStatus.EXPIRING && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">Certificate Expiring Soon</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This certificate will expire on {new Date(certificate.validTo).toLocaleDateString()}. 
              Consider renewing it now.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Download className="w-4 h-4" />
          Download Certificate
        </button>
        <button
          onClick={() => setShowPrivateKey(!showPrivateKey)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <Key className="w-4 h-4" />
          {showPrivateKey ? 'Hide' : 'Show'} Private Key
        </button>
        {certificate.status !== CertificateStatus.REVOKED && (
          <>
            <button
              onClick={() => renewMutation.mutate()}
              disabled={renewMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Renew
            </button>
            <button
              onClick={() => setShowRevokeModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
            >
              <XCircle className="w-4 h-4" />
              Revoke
            </button>
          </>
        )}
      </div>

      {/* Certificate Details */}
      <div className="bg-white rounded-lg shadow divide-y">
        <DetailRow label="Common Name" value={certificate.commonName} />
        <DetailRow label="Organization" value={certificate.organization || '-'} />
        <DetailRow label="Organization Unit" value={certificate.organizationUnit || '-'} />
        <DetailRow label="Country" value={certificate.country || '-'} />
        <DetailRow label="State" value={certificate.state || '-'} />
        <DetailRow label="City" value={certificate.locality || '-'} />
        <DetailRow label="Key Type" value={certificate.type.toUpperCase().replace('_', ' ')} />
        <DetailRow label="Valid From" value={new Date(certificate.validFrom).toLocaleString()} />
        <DetailRow label="Valid To" value={new Date(certificate.validTo).toLocaleString()} />
        <DetailRow label="Created" value={new Date(certificate.createdAt).toLocaleString()} />
        {certificate.subjectAltNames.length > 0 && (
          <DetailRow
            label="Subject Alt Names"
            value={
              <div className="flex flex-wrap gap-2">
                {certificate.subjectAltNames.map((name) => (
                  <span key={name} className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {name}
                  </span>
                ))}
              </div>
            }
          />
        )}
        {certificate.status === CertificateStatus.REVOKED && (
          <>
            <DetailRow label="Revoked At" value={new Date(certificate.revokedAt!).toLocaleString()} />
            <DetailRow label="Revocation Reason" value={certificate.revocationReason || '-'} />
          </>
        )}
      </div>

      {/* Private Key Display */}
      {showPrivateKey && privateKeyData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Private Key</h2>
            <span className="text-xs text-red-600 font-medium">⚠️ SENSITIVE DATA</span>
          </div>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
            {privateKeyData.privateKey}
          </pre>
          <p className="text-sm text-gray-500 mt-2">
            Keep this private key secure. Never share it publicly.
          </p>
        </div>
      )}

      {/* Certificate PEM */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Certificate (PEM)</h2>
        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
          {certificate.certificate}
        </pre>
      </div>

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revoke Certificate</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to revoke this certificate? This action cannot be undone.
            </p>
            <textarea
              value={revocationReason}
              onChange={(e) => setRevocationReason(e.target.value)}
              placeholder="Reason for revocation..."
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => revokeMutation.mutate()}
                disabled={!revocationReason || revokeMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-6 py-4 grid grid-cols-3 gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 col-span-2">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: CertificateStatus }) {
  const styles = {
    [CertificateStatus.ACTIVE]: 'bg-green-100 text-green-700',
    [CertificateStatus.EXPIRING]: 'bg-yellow-100 text-yellow-700',
    [CertificateStatus.EXPIRED]: 'bg-red-100 text-red-700',
    [CertificateStatus.REVOKED]: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`px-4 py-2 rounded-full text-sm font-medium uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}

