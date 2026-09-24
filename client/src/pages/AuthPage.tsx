import React, { useState } from 'react';
import {
  Building2,
  HeartHandshake,
  Lock,
  Mail,
  MapPin,
  Phone,
  Truck,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Role = 'DONOR' | 'NGO' | 'DRIVER';

const roles = [
  {
    value: 'DONOR' as Role,
    label: 'Food Donor',
    description: 'Restaurant, canteen or grocery store',
    icon: HeartHandshake,
  },
  {
    value: 'NGO' as Role,
    label: 'NGO / Shelter',
    description: 'Receive and distribute food',
    icon: Building2,
  },
  {
    value: 'DRIVER' as Role,
    label: 'Delivery Person',
    description: 'Pick up and deliver food safely',
    icon: Truck,
  },
];

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<Role>('DONOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    phone: '',
    address: '',
    capacity: '',
    vehicleType: 'Bike',
  });

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        return;
      }

      const profileData =
        role === 'NGO'
          ? {
              organization_name: form.organizationName || form.name,
              phone: form.phone,
              address: form.address,
              maximum_capacity_kg: Number(form.capacity) || 100,
              accepted_food_types: ['Cooked', 'Packaged'],
              latitude: 26.9124,
              longitude: 75.7873,
            }
          : role === 'DRIVER'
            ? {
                phone: form.phone,
                vehicle_type: form.vehicleType,
                vehicle_capacity_kg: Number(form.capacity) || 20,
                latitude: 26.9124,
                longitude: 75.7873,
              }
            : {
                organization_name: form.organizationName || form.name,
                phone: form.phone,
                address: form.address,
                latitude: 26.9124,
                longitude: 75.7873,
              };

      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
        profileData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl lg:grid-cols-2">
        <section className="flex flex-col justify-between bg-emerald-600 p-8 lg:p-12">
          <div>
            <div className="mb-10 flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-3">
                <HeartHandshake className="h-7 w-7" />
              </div>
              <span className="text-xl font-bold">Surplus to Shelter</span>
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
              Food rescue network
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight lg:text-5xl">
              Rescue good food before it becomes waste.
            </h1>
            <p className="mt-5 max-w-md text-emerald-50">
              Connect food donors, verified NGOs and delivery partners in one real-time rescue network.
            </p>
          </div>

          <div className="mt-12 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
            <p className="rounded-xl bg-white/15 p-4">Food reaches the right shelter faster.</p>
            <p className="rounded-xl bg-white/15 p-4">Track every pickup and delivery.</p>
            <p className="rounded-xl bg-white/15 p-4">Measure meals and waste prevented.</p>
          </div>
        </section>

        <section className="flex items-center bg-slate-900 p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-3xl font-bold">
              {mode === 'login' ? 'Welcome back' : 'Join the rescue network'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {mode === 'login'
                ? 'Sign in to continue to your dashboard.'
                : 'Create an account based on your role.'}
            </p>

            <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  mode === 'login' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  mode === 'register' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Choose your role</label>
                    <div className="grid gap-2">
                      {roles.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            type="button"
                            key={item.value}
                            onClick={() => setRole(item.value)}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                              role === item.value
                                ? 'border-emerald-400 bg-emerald-400/10'
                                : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                            }`}
                          >
                            <Icon className="h-5 w-5 text-emerald-400" />
                            <span>
                              <span className="block text-sm font-semibold">{item.label}</span>
                              <span className="block text-xs text-slate-400">{item.description}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">Full name</span>
                    <span className="relative block">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        required
                        value={form.name}
                        onChange={(e) => updateForm('name', e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 outline-none focus:border-emerald-400"
                        placeholder="Your full name"
                      />
                    </span>
                  </label>

                  {role !== 'DRIVER' && (
                    <>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Organisation name</span>
                        <input
                          value={form.organizationName}
                          onChange={(e) => updateForm('organizationName', e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 outline-none focus:border-emerald-400"
                          placeholder="Restaurant, canteen or NGO name"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Address</span>
                        <span className="relative block">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <input
                            required
                            value={form.address}
                            onChange={(e) => updateForm('address', e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 outline-none focus:border-emerald-400"
                            placeholder="Enter your Jaipur address"
                          />
                        </span>
                      </label>
                    </>
                  )}
                </>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Email address</span>
                <span className="relative block">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 outline-none focus:border-emerald-400"
                    placeholder="name@email.com"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Password</span>
                <span className="relative block">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={form.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 outline-none focus:border-emerald-400"
                    placeholder="Minimum 6 characters"
                  />
                </span>
              </label>

              {mode === 'register' && (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">Phone number</span>
                    <span className="relative block">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        required
                        value={form.phone}
                        onChange={(e) => updateForm('phone', e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-3 outline-none focus:border-emerald-400"
                        placeholder="10-digit phone number"
                      />
                    </span>
                  </label>

                  {role === 'DRIVER' && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">Vehicle type</span>
                      <select
                        value={form.vehicleType}
                        onChange={(e) => updateForm('vehicleType', e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 outline-none focus:border-emerald-400"
                      >
                        <option>Bike</option>
                        <option>Scooter</option>
                        <option>Car</option>
                        <option>Van</option>
                      </select>
                    </label>
                  )}

                  {(role === 'NGO' || role === 'DRIVER') && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        {role === 'NGO' ? 'Food capacity in kg' : 'Vehicle capacity in kg'}
                      </span>
                      <input
                        required
                        type="number"
                        min="1"
                        value={form.capacity}
                        onChange={(e) => updateForm('capacity', e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 outline-none focus:border-emerald-400"
                        placeholder={role === 'NGO' ? 'Example: 100' : 'Example: 20'}
                      />
                    </label>
                  )}
                </>
              )}

              {error && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                disabled={loading}
                className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Login to dashboard'
                    : 'Create account'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
};