import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { certificatesApi } from '../services/api';
import { CertificateType } from '../types';

export default function CreateCertificatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    commonName: '',
    organization: '',
    organizationUnit: '',
    country: '',
    state: '',
    locality: '',
    type: CertificateType.RSA_2048,
    validityDays: 365,
  });
  const [subjectAltNames, setSubjectAltNames] = useState<string[]>([]);
  const [newAltName, setNewAltName] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: certificatesApi.create,
    onSuccess: (data) => {
      navigate(`/certificates/${data.id}`);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create certificate');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate({
      ...formData,
      subjectAltNames: subjectAltNames.length > 0 ? subjectAltNames : undefined,
    });
  };

  const addAltName = () => {
    if (newAltName && !subjectAltNames.includes(newAltName)) {
      setSubjectAltNames([...subjectAltNames, newAltName]);
      setNewAltName('');
    }
  };

  const removeAltName = (name: string) => {
    setSubjectAltNames(subjectAltNames.filter((n) => n !== name));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/certificates')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Certificate</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

            <div>
              <label htmlFor="commonName" className="block text-sm font-medium text-gray-700 mb-1">
                Common Name (CN) *
              </label>
              <input
                id="commonName"
                type="text"
                required
                value={formData.commonName}
                onChange={(e) => setFormData({ ...formData, commonName: e.target.value })}
                placeholder="example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Domain name or service identifier</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Key Type *
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as CertificateType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={CertificateType.RSA_2048}>RSA 2048</option>
                  <option value={CertificateType.RSA_4096}>RSA 4096</option>
                  <option value={CertificateType.EC_P256}>EC P-256</option>
                  <option value={CertificateType.EC_P384}>EC P-384</option>
                </select>
              </div>
              <div>
                <label htmlFor="validityDays" className="block text-sm font-medium text-gray-700 mb-1">
                  Validity (Days) *
                </label>
                <input
                  id="validityDays"
                  type="number"
                  required
                  min="1"
                  max="3650"
                  value={formData.validityDays}
                  onChange={(e) => setFormData({ ...formData, validityDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Organization Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Organization Details</h2>

            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                Organization (O)
              </label>
              <input
                id="organization"
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="My Company Inc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="organizationUnit" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Unit (OU)
              </label>
              <input
                id="organizationUnit"
                type="text"
                value={formData.organizationUnit}
                onChange={(e) => setFormData({ ...formData, organizationUnit: e.target.value })}
                placeholder="IT Department"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country (C)
                </label>
                <input
                  id="country"
                  type="text"
                  maxLength={2}
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                  placeholder="US"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State (ST)
                </label>
                <input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="California"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="locality" className="block text-sm font-medium text-gray-700 mb-1">
                  City (L)
                </label>
                <input
                  id="locality"
                  type="text"
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  placeholder="San Francisco"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Subject Alternative Names */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Subject Alternative Names (SANs)</h2>

            <div className="flex gap-2">
              <input
                type="text"
                value={newAltName}
                onChange={(e) => setNewAltName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAltName())}
                placeholder="www.example.com or user@example.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addAltName}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {subjectAltNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {subjectAltNames.map((name) => (
                  <span
                    key={name}
                    className="flex items-center gap-2 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeAltName(name)}
                      className="hover:text-primary-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/certificates')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

