import { FormEvent, useState } from 'react';
import DeviceTable from '../components/DeviceTable';
import { useLiveDevices } from '../hooks/useLiveDevices';
import { createDevice, deleteDevice, errorMessage } from '../services/api';
import { DEVICE_TYPES, Device, DeviceType } from '../types/device';
import { typeLabel } from '../utils/format';

const EMPTY_FORM = { sim_id: '', name: '', ip_address: '', type: 'router' as DeviceType, location: '' };

export default function Devices() {
  const { devices, loading, error, reload } = useLiveDevices();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await createDevice({ ...form, location: form.location || undefined });
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setFormError(errorMessage(err, 'Could not add the device'));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(device: Device) {
    if (!window.confirm(`Delete "${device.name}" and all of its metrics?`)) return;
    try {
      await deleteDevice(device.id);
      await reload();
    } catch (err) {
      window.alert(errorMessage(err, 'Could not delete the device'));
    }
  }

  return (
    <div className="page">
      <h1>Devices</h1>
      {error && <div className="banner banner-error">{error}</div>}

      {loading ? <div className="empty">Loading…</div> : <DeviceTable devices={devices} onDelete={onDelete} />}

      <h2>Add device</h2>
      <form className="card form" onSubmit={onSubmit}>
        <label>
          Simulator ID
          <input
            required
            maxLength={32}
            placeholder="e.g. R3"
            value={form.sim_id}
            onChange={(e) => set('sim_id')(e.target.value)}
          />
        </label>
        <label>
          Name
          <input
            required
            maxLength={100}
            placeholder="e.g. Branch Router"
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
          />
        </label>
        <label>
          IP address
          <input
            required
            placeholder="e.g. 10.0.5.1"
            value={form.ip_address}
            onChange={(e) => set('ip_address')(e.target.value)}
          />
        </label>
        <label>
          Type
          <select value={form.type} onChange={(e) => set('type')(e.target.value)}>
            {DEVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {typeLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <input
            maxLength={100}
            placeholder="optional"
            value={form.location}
            onChange={(e) => set('location')(e.target.value)}
          />
        </label>
        <div className="form-actions">
          <button className="btn" disabled={saving}>
            {saving ? 'Adding…' : 'Add device'}
          </button>
          {formError && <span className="form-error">{formError}</span>}
        </div>
        <p className="muted small form-note">
          The simulator ID must match a device the C++ simulator knows (R1, R2, SW1, SW2, FW1, SRV1, SRV2,
          AP1); other IDs are shown as offline.
        </p>
      </form>
    </div>
  );
}
