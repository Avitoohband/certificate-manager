import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, XCircle, Plus } from 'lucide-react';
import { certificatesApi } from '../services/api';
import { CertificateStatus } from '../types';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => certificatesApi.getAll(),
  });

  const stats = {
    total: data?.total || 0,
    active: data?.certificates.filter((c) => c.status === CertificateStatus.ACTIVE).length || 0,
    expiring: data?.certificates.filter((c) => c.status === CertificateStatus.EXPIRING).length || 0,
    expired: data?.certificates.filter((c) => c.status === CertificateStatus.EXPIRED).length || 0,
    revoked: data?.certificates.filter((c) => c.status === CertificateStatus.REVOKED).length || 0,
  };

  const recentCerts = data?.certificates.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <Link
          to="/certificates/new"
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Certificate
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Certificates"
          value={stats.total}
          icon={<FileText className="w-8 h-8 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={<CheckCircle className="w-8 h-8 text-green-600" />}
          color="green"
        />
        <StatCard
          title="Expiring Soon"
          value={stats.expiring}
          icon={<AlertCircle className="w-8 h-8 text-yellow-600" />}
          color="yellow"
        />
        <StatCard
          title="Expired/Revoked"
          value={stats.expired + stats.revoked}
          icon={<XCircle className="w-8 h-8 text-red-600" />}
          color="red"
        />
      </div>

      {/* Recent Certificates */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Recent Certificates</h2>
        </div>
        <div className="divide-y">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : recentCerts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No certificates yet</div>
          ) : (
            recentCerts.map((cert) => (
              <Link
                key={cert.id}
                to={`/certificates/${cert.id}`}
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{cert.commonName}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Expires: {new Date(cert.validTo).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={cert.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
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
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

