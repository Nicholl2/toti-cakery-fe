import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { toast } from 'react-hot-toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { SellerModal } from '@/components/ui/SellerModal';
import {
  User,
  Users,
  MessageCircle,
  Edit,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Plus,
  
} from 'lucide-react';
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  uploadAvatar,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  type UserProfile,
  type UserProfileUpdate,
} from '@/services/sellerSettingsService';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useWhatsApp } from '@/context/WhatsAppContext';
import {
  getWhatsAppStatus,
  getWhatsAppQr,
  resetWhatsAppNumber,
  type WhatsAppStatus
} from "@/services/whatsappService";
import Cropper from 'react-easy-crop';

// ============================================================
// UTILS FOR IMAGE CROPPING
// ============================================================
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) return null;

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    croppedCanvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      } else {
        resolve(null);
      }
    }, 'image/jpeg');
  });
}

// ============================================================
// KOMPONEN TAB NAVIGATION
// ============================================================

interface TabButtonProps {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, icon: Icon, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition border-b-2 ${
        isActive
          ? 'border-[#d85b30] text-[#d85b30]'
          : 'border-transparent text-[#6f5448] hover:text-[#4b2417]'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ============================================================
// TAB 1: MY PROFILE
// ============================================================

function ProfileTab() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    nomor_wa_admin: '',
  });

  // Avatar Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Password State
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);


  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMyProfile();
        if (ignore) return;
        setProfile(data);
        setFormData({
          username: data.username || '',
          email: data.email || '',
          phone_number: data.phone_number || '',
          nomor_wa_admin: data.nomor_wa_admin || '',
        });
      } catch (err: any) {
        if (ignore) return;
        console.error(err);
        setError('Failed to load profile.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  const handleEditClick = () => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        phone_number: profile.phone_number || '',
        nomor_wa_admin: profile.nomor_wa_admin || '',
      });
    }
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        phone_number: profile.phone_number || '',
        nomor_wa_admin: profile.nomor_wa_admin || '',
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const hasChanges = profile ? (
    formData.username !== (profile.username || '') ||
    formData.email !== (profile.email || '') ||
    formData.phone_number !== (profile.phone_number || '') ||
    formData.nomor_wa_admin !== (profile.nomor_wa_admin || '')
  ) : false;

  const handleSaveProfile = async () => {
    if (formData.username && !/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, underscore (_), or hyphen (-). No spaces allowed.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const payload: UserProfileUpdate = {};
      if (formData.username !== (profile?.username || '')) payload.username = formData.username;
      if (formData.email !== (profile?.email || '')) payload.email = formData.email;
      if (formData.phone_number !== (profile?.phone_number || '')) payload.phone_number = formData.phone_number;
      if (formData.nomor_wa_admin !== (profile?.nomor_wa_admin || '')) payload.nomor_wa_admin = formData.nomor_wa_admin;

      const updated = await updateMyProfile(payload);
      setProfile(updated);
      setIsEditing(false);
      showToast({ message: 'Profile updated successfully.', type: 'success' });
    } catch (err: any) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map((d: any) => {
            const field = d.loc && d.loc.length > 1 ? d.loc[d.loc.length - 1] : 'Field';
            return `${field}: ${d.msg}`;
          }).join(', '));
        } else {
          setError(detail);
        }
      } else {
        setError('Unable to update your profile right now.');
      }
      showToast({ message: 'Unable to update your profile right now.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Avatar Handlers
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setAvatarPreviewUrl(url);
      setShowAvatarModal(true);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleAvatarConfirm = async () => {
    if (!avatarPreviewUrl || !croppedAreaPixels) return;

    try {
      setIsUploadingAvatar(true);
      const croppedImageFile = await getCroppedImg(avatarPreviewUrl, croppedAreaPixels);
      
      if (!croppedImageFile) {
        showToast({ message: 'Failed to process image.', type: 'error' });
        return;
      }

      const updated = await uploadAvatar(croppedImageFile);
      setProfile(updated);
      showToast({ message: 'Profile photo updated successfully.', type: 'success' });
      setShowAvatarModal(false);
    } catch (err) {
      console.error(err);
      showToast({ message: 'Unable to update profile photo right now.', type: 'error' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarCancel = () => {
    setShowAvatarModal(false);
    setAvatarPreviewUrl(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  // Password Handlers
  const handleUpdatePassword = async () => {
    if (!passwordData.current) {
      setPasswordError('Current password is required');
      return;
    }
    if (passwordData.new.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    try {
      setSavingPassword(true);
      setPasswordError(null);
      await changeMyPassword({
        old_password: passwordData.current,
        new_password: passwordData.new,
      });
      showToast({ message: 'Password updated successfully.', type: 'success' });
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setPasswordError(err.response.data.detail);
      } else {
        setPasswordError('Failed to update password.');
      }
      showToast({ message: 'Unable to update password right now.', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading profile...</div>;
  if (!profile) return <div className="py-8 text-center text-red-500">Failed to load profile.</div>;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-16 w-16 rounded-full object-cover border border-[#d0bfaf]" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d85b30] text-2xl font-black text-white">
                {profile.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <span className="text-xs text-white">Edit Photo</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleAvatarFileSelect} 
              />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#4b2417]">{profile.username}</h3>
            <p className="text-sm capitalize text-[#6f5448]">
              {profile.role_name || (profile.role_id === 1 ? 'Owner' : profile.role_id === 2 ? 'Admin' : 'Staff')}
            </p>
            {profile.is_active ? (
              <p className="text-sm text-green-600 font-semibold">Active</p>
            ) : (
              <p className="text-sm text-red-600 font-semibold">Inactive</p>
            )}
          </div>
        </div>
      </div>

      {/* Personal Data Section */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase text-[#6f5448]">Personal Data</h3>
          {!isEditing && (
            <button
              onClick={handleEditClick}
              className="flex items-center gap-2 text-sm font-semibold text-[#d85b30] hover:text-[#c04e28]"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
        
        {error && isEditing && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#4b2417]">Username *</label>
            <input
              type="text"
              value={isEditing ? formData.username : profile.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              readOnly={!isEditing}
              className={`mt-1 w-full rounded-lg border px-4 py-2 text-sm outline-none ${
                isEditing 
                  ? 'border-[#d0bfaf] focus:border-[#d85b30]' 
                  : 'border-transparent bg-gray-50 text-gray-700 focus:border-transparent'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#4b2417]">Email (Optional)</label>
            <input
              type="email"
              value={isEditing ? formData.email : (profile.email || '')}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              readOnly={!isEditing}
              className={`mt-1 w-full rounded-lg border px-4 py-2 text-sm outline-none ${
                isEditing 
                  ? 'border-[#d0bfaf] focus:border-[#d85b30]' 
                  : 'border-transparent bg-gray-50 text-gray-700 focus:border-transparent'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#4b2417]">Phone Number (Optional)</label>
            <input
              type="tel"
              value={isEditing ? formData.phone_number : (profile.phone_number || '')}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              readOnly={!isEditing}
              className={`mt-1 w-full rounded-lg border px-4 py-2 text-sm outline-none ${
                isEditing 
                  ? 'border-[#d0bfaf] focus:border-[#d85b30]' 
                  : 'border-transparent bg-gray-50 text-gray-700 focus:border-transparent'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#4b2417]">Admin WhatsApp Number (Optional)</label>
            <input
              type="tel"
              value={isEditing ? formData.nomor_wa_admin : (profile.nomor_wa_admin || '')}
              onChange={(e) => setFormData({ ...formData, nomor_wa_admin: e.target.value })}
              readOnly={!isEditing}
              placeholder={isEditing ? "Example: +62812..." : ""}
              className={`mt-1 w-full rounded-lg border px-4 py-2 text-sm outline-none ${
                isEditing 
                  ? 'border-[#d0bfaf] focus:border-[#d85b30]' 
                  : 'border-transparent bg-gray-50 text-gray-700 focus:border-transparent'
              }`}
            />
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex gap-3 border-t border-gray-200 pt-6">
            <button
              onClick={handleCancelClick}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={saving || !hasChanges}
              className="rounded-lg bg-[#d85b30] px-6 py-2 text-sm font-semibold text-white hover:bg-[#c04e28] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase text-[#6f5448]">Password & Security</h3>
        <p className="mt-1 text-xs text-[#8b7166]">
          Change your account password to keep your account secure.
        </p>

        {passwordError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {passwordError}
          </div>
        )}

        <div className="mt-4 space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-semibold text-[#4b2417]">Current Password *</label>
            <div className="relative mt-1">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                placeholder="Enter current password"
                className="w-full rounded-lg border border-[#d0bfaf] px-4 py-2 pr-10 text-sm outline-none focus:border-[#d85b30]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b7166]"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#4b2417]">New Password *</label>
            <div className="relative mt-1">
              <input
                type={showNew ? 'text' : 'password'}
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                placeholder="Min. 6 characters"
                className="w-full rounded-lg border border-[#d0bfaf] px-4 py-2 pr-10 text-sm outline-none focus:border-[#d85b30]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b7166]"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#4b2417]">Confirm New Password *</label>
            <div className="relative mt-1">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                placeholder="Repeat new password"
                className="w-full rounded-lg border border-[#d0bfaf] px-4 py-2 pr-10 text-sm outline-none focus:border-[#d85b30]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b7166]"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleUpdatePassword}
            disabled={savingPassword || !passwordData.current || !passwordData.new || !passwordData.confirm}
            className="w-full rounded-lg bg-[#d85b30] py-2 text-sm font-semibold text-white hover:bg-[#c04e28] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Avatar Edit Modal */}
      {showAvatarModal && avatarPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-[#4b2417]">Edit Photo</h2>
            
            <div className="relative h-64 w-full bg-gray-100 rounded-lg overflow-hidden">
              <Cropper
                image={avatarPreviewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleAvatarCancel}
                disabled={isUploadingAvatar}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAvatarConfirm}
                disabled={isUploadingAvatar}
                className="rounded-lg bg-[#d85b30] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c04e28] disabled:opacity-50"
              >
                {isUploadingAvatar ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 3: USERS (with add/edit modal)
// ============================================================

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: UserProfile | null;
}

function UserModal({ isOpen, onClose, onSave, initialData }: UserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    role_id: 3,
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        username: initialData.username,
        email: initialData.email || '',
        phone_number: initialData.phone_number || '',
        role_id: initialData.role_id,
        password: '',
      });
    } else {
      setFormData({
        username: '',
        email: '',
        phone_number: '',
        role_id: 3,
        password: '',
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.phone_number) {
      toast.error('All fields are required');
      return;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast.error('Username can only contain letters, numbers, underscore (_), or hyphen (-). No spaces allowed.');
      return;
    }

    if (!initialData && !formData.password) {
      toast.error('Password is required for new user');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <SellerModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit User' : 'Add User'}
      size="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="user-form"
            className="rounded-lg bg-[#d85b30] px-6 py-2 text-sm font-semibold text-white hover:bg-[#c04e28]"
          >
            {initialData ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#4b2417]">
            Username *
          </label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={e => setFormData({...formData, username: e.target.value})}
            className="mt-1 w-full rounded-lg border border-[#d0bfaf] px-4 py-2 outline-none focus:border-[#d85b30]"
            placeholder="johndoe"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-[#4b2417]">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="mt-1 w-full rounded-lg border border-[#d0bfaf] px-4 py-2 outline-none focus:border-[#d85b30]"
            placeholder="johndoe@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#4b2417]">
            Phone Number
          </label>
          <input
            type="text"
            value={formData.phone_number}
            onChange={e => setFormData({...formData, phone_number: e.target.value})}
            className="mt-1 w-full rounded-lg border border-[#d0bfaf] px-4 py-2 outline-none focus:border-[#d85b30]"
            placeholder="628123456789"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#4b2417]">
            Role *
          </label>
          <select
            value={formData.role_id}
            onChange={e => setFormData({...formData, role_id: Number(e.target.value)})}
            className="mt-1 w-full rounded-lg border border-[#d0bfaf] px-4 py-2 outline-none focus:border-[#d85b30]"
          >
            <option value={3}>Admin</option>
            <option value={2}>Owner</option>
          </select>
        </div>

        {!initialData && (
          <div>
            <label className="block text-sm font-semibold text-[#4b2417]">
              Password *
            </label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full rounded-lg border border-[#d0bfaf] px-4 py-2 pr-10 outline-none focus:border-[#d85b30]"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </form>
    </SellerModal>  );
}

function UsersTab() {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';
  const canManageUsers = isOwner;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All roles');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    if (toastMessage) {
      showToast({ message: toastMessage, type: 'success' });
      setToastMessage('');
    }
  }, [toastMessage, showToast]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users (Endpoint might not be available)", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone_number && u.phone_number.includes(searchQuery)) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    let targetRoleId = 0;
    if (filterRole === 'admin') targetRoleId = 2;
    if (filterRole === 'staff') targetRoleId = 3;
    const matchRole = filterRole === 'All roles' || u.role_id === targetRoleId;
    return matchSearch && matchRole;
  });

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <span className="text-xs font-semibold text-green-600">Active</span>;
    }
    return <span className="text-xs font-semibold text-red-600">Inactive</span>;
  };

  const extractErrorMessage = (error: any, defaultMsg: string) => {
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (Array.isArray(detail)) {
        // Validation error from FastAPI
        return detail.map((d: any) => {
          const field = d.loc && d.loc.length > 1 ? d.loc[d.loc.length - 1] : 'Field';
          return `${field}: ${d.msg}`;
        }).join('\n');
      }
      return detail;
    }
    return defaultMsg;
  };

  const handleAddUser = async (data: any) => {
    try {
      await addUser(data);
      await loadUsers(); // Refetch data
      setToastMessage('User successfully added!');
      closeModal();
    } catch (error: any) {
      showToast({ message: extractErrorMessage(error, 'Failed to add user.'), type: 'error' });
    }
  };

  const handleEditUser = async (data: any) => {
    if (!editingUser) return;
    try {
      const updated = await updateUser(editingUser.id, data);
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      showToast({ message: 'User successfully updated!', type: 'success' });
      closeModal();
    } catch (error: any) {
      showToast({ message: extractErrorMessage(error, 'Failed to update user.'), type: 'error' });
    }
  };

  const [userToDeleteId, setUserToDeleteId] = useState<number | null>(null);

  const confirmDeleteUser = async () => {
    if (!userToDeleteId) return;
    const id = userToDeleteId;
    setUserToDeleteId(null);
    try {
      await deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
      showToast({ message: 'User deleted successfully.', type: 'success' });
    } catch (error: any) {
      showToast({ message: extractErrorMessage(error, 'Failed to delete user.'), type: 'error' });
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b7166]" />
          <input
            type="text"
            placeholder="Search name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#d0bfaf] py-2 pl-9 pr-4 text-sm outline-none focus:border-[#d85b30]"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-lg border border-[#d0bfaf] px-3 py-2 text-sm outline-none focus:border-[#d85b30]"
        >
          <option value="All roles">All roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
        {canManageUsers && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1 rounded-lg bg-[#d85b30] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c04e28]"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
           <div className="py-8 text-center text-gray-500">No users found.</div>
        ) : filteredUsers.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between rounded-xl bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3e2d7] text-sm font-black text-[#4b2417] uppercase">
                {user.username.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-[#4b2417]">{user.username}</p>
                <p className="text-xs text-[#6f5448]">
                  @{user.username} · {user.phone_number} · {getStatusBadge(user.is_active)}
                  {user.email && <span className="ml-2">{user.email}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#f3e2d7] px-2 py-0.5 text-xs font-bold capitalize text-[#4b2417]">
                {user.role_id === 1 ? 'Owner' : user.role_id === 2 ? 'Admin' : 'Staff'}
              </span>
              {canManageUsers && user.role_id !== 1 && (
                <>
                  <button
                    onClick={() => openEditModal(user)}
                    className="rounded p-1 text-[#6f5448] hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setUserToDeleteId(user.id)}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <UserModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={editingUser ? handleEditUser : handleAddUser}
        initialData={editingUser}
      />

      <ConfirmationModal
        isOpen={userToDeleteId !== null}
        title="Delete User"
        message="Are you sure you want to delete this user?"
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDeleteId(null)}
      />
    </div>
  );
}

// ============================================================
// TAB 4: WHATSAPP
// ============================================================

function WhatsAppTab() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';

  // Chatbot Status State
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const { whatsappNumberDisplay, refetch: refetchWhatsAppNumber } = useWhatsApp();
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const [isResetting, setIsResetting] = useState(false);
  const [isPreparingQr, setIsPreparingQr] = useState(false);
  
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  
  const [showConfirm, setShowConfirm] = useState(false);

  // Owner Phone State
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
  const [isEditingOwnerPhone, setIsEditingOwnerPhone] = useState(false);
  const [ownerPhoneInput, setOwnerPhoneInput] = useState('');
  const [isSavingOwnerPhone, setIsSavingOwnerPhone] = useState(false);
  const [ownerPhoneError, setOwnerPhoneError] = useState<string | null>(null);

  const { showToast } = useToast();

  // Load Owner Profile
  const loadOwnerProfile = async () => {
    try {
      const data = await getMyProfile();
      setOwnerProfile(data);
      setOwnerPhoneInput(data.phone_number || '');
    } catch (err) {
      console.error("Failed to load owner profile", err);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadOwnerProfile();
    }
  }, [isOwner]);

  // Chatbot Status Polling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isActive = true;

    const fetchStatus = async () => {
      try {
        const data = await getWhatsAppStatus();
        if (!isActive) return;
        setStatus(data);
        setErrorStatus(null);
        
        // Clear preparing state if connected
        if (data.keadaan === 'tersambung') {
          setIsPreparingQr(false);
        }
      } catch (err: any) {
        if (!isActive) return;
        if (err.response?.status === 503) {
          setErrorStatus(t('whatsapp.qr_unavailable', 'WhatsApp service is unavailable'));
        } else if (err.response?.status === 403) {
          setErrorStatus(t('common.error', 'An error occurred'));
        } else {
          setErrorStatus(t('whatsapp.error_retry', 'Error connecting to WhatsApp. Retrying...'));
        }
      } finally {
        if (isActive) {
          setLoadingStatus(false);
          timeoutId = setTimeout(fetchStatus, 3000);
        }
      }
    };

    fetchStatus();

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [t]);

  // Handle Object URL cleanup
  useEffect(() => {
    return () => {
      if (qrUrl) {
        URL.revokeObjectURL(qrUrl);
      }
    };
  }, [qrUrl]);

  // QR Polling for Owner when menunggu_scan
  useEffect(() => {
    if (!isOwner) return;
    
    if (status?.keadaan !== 'menunggu_scan') {
      setQrUrl(null);
      setQrError(null);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let isActive = true;

    const fetchQr = async () => {
      try {
        const blob = await getWhatsAppQr();
        if (!isActive) return;
        
        const url = URL.createObjectURL(blob);
        setQrUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return url;
        });
        setQrError(null);
        setIsPreparingQr(false); // QR is ready
        
        if (isActive) {
          timeoutId = setTimeout(fetchQr, 5000);
        }
      } catch (err: any) {
        if (!isActive) return;
        
        if (err.response?.status === 404) {
          // QR not ready yet, continue polling
          timeoutId = setTimeout(fetchQr, 5000);
        } else if (err.response?.status === 503) {
          // Service unavailable, stop polling
          setQrError(t('whatsapp.qr_unavailable', 'WhatsApp service is unavailable'));
          setIsPreparingQr(false);
        } else if (err.response?.status === 403) {
          setQrError(t('common.error', 'An error occurred'));
          setIsPreparingQr(false);
        } else {
          timeoutId = setTimeout(fetchQr, 5000);
        }
      }
    };

    fetchQr();

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [status?.keadaan, isOwner, t]);


  const handleResetChatbot = async () => {
    setShowConfirm(false);
    try {
      setIsResetting(true);
      setQrError(null);
      await resetWhatsAppNumber();
      await refetchWhatsAppNumber();
      setIsPreparingQr(true);
      // Optimistic update
      setStatus((prev) => prev ? { ...prev, keadaan: 'terputus' } : null);
      showToast({ message: t('whatsapp.qr_instruction', 'Number reset successfully'), type: 'success' });
    } catch (err: any) {
      showToast({ message: t('whatsapp.error_retry', 'Error connecting to WhatsApp. Retrying...'), type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveOwnerPhone = async () => {
    try {
      setIsSavingOwnerPhone(true);
      setOwnerPhoneError(null);
      const updated = await updateMyProfile({ phone_number: ownerPhoneInput });
      setOwnerProfile(updated);
      setIsEditingOwnerPhone(false);
      showToast({ message: t('whatsapp.owner_updated_success', 'Owner number updated successfully'), type: 'success' });
    } catch (err: any) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          setOwnerPhoneError(detail.map((d: any) => d.msg).join(', '));
        } else {
          setOwnerPhoneError(detail);
        }
      } else {
        setOwnerPhoneError(t('common.error', 'An error occurred'));
      }
    } finally {
      setIsSavingOwnerPhone(false);
    }
  };

  const isDisconnectedNormal = status?.keadaan === 'terputus' && !isPreparingQr && !isResetting;
  const isPreparing = isResetting || isPreparingQr || (status?.keadaan === 'menunggu_scan' && !qrUrl && !qrError && isOwner);

  if (loadingStatus && !status) {
    return <div className="py-8 text-center text-gray-500">{t('whatsapp.status_preparing_qr', 'Preparing WhatsApp...')}</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: CHATBOT WHATSAPP */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase text-[#6f5448]">{t('whatsapp.chatbot_section_title', 'WhatsApp Chatbot')}</h3>
        
        {errorStatus && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorStatus}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {status?.keadaan === 'tersambung' && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-green-800">{t('whatsapp.status_connected', 'Connected')}</h4>
                  <p className="text-sm text-green-700">{t('whatsapp.chatbot_phone', 'Chatbot WhatsApp Number')}: {whatsappNumberDisplay || '—'}</p>
                  <p className="text-sm text-green-700">{t('whatsapp.profile_name', 'Profile')}: {status.profile_name || '—'}</p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={isResetting || isPreparingQr}
                    className="shrink-0 rounded-lg bg-[#d85b30] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c04e28] disabled:opacity-50"
                  >
                    {t('whatsapp.change_chatbot_number', 'Change Chatbot Number')}
                  </button>
                )}
              </div>
            </div>
          )}

          {isDisconnectedNormal && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-yellow-800">{t('whatsapp.status_disconnected', 'Disconnected')}</h4>
                  <p className="text-sm text-yellow-700">{t('whatsapp.chatbot_unavailable', 'Chatbot is currently unavailable')}</p>
                </div>
                {isOwner && (
                  <button
                    onClick={handleResetChatbot}
                    disabled={isResetting}
                    className="rounded-lg bg-[#d85b30] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c04e28] disabled:opacity-50"
                  >
                    {t('whatsapp.show_qr', 'Show QR Code')}
                  </button>
                )}
              </div>
            </div>
          )}

          {isPreparing && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="font-semibold text-blue-800">{t('whatsapp.status_preparing_qr', 'Preparing QR Code...')}</p>
            </div>
          )}

          {status?.keadaan === 'menunggu_scan' && !isPreparingQr && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center flex flex-col items-center">
              <h4 className="mb-2 font-bold text-yellow-800">{t('whatsapp.status_waiting_scan', 'Waiting for Scan')}</h4>
              
              {qrError && isOwner && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {qrError}
                </div>
              )}
              
              {isOwner && qrUrl && (
                <>
                  <p className="mb-4 text-sm text-yellow-700">
                    {t('whatsapp.qr_instruction', 'Please scan the QR code below to connect your WhatsApp number.')}
                  </p>
                  <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
                    <img src={qrUrl} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: OWNER WHATSAPP */}
      {isOwner && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase text-[#6f5448]">{t('whatsapp.owner_section_title', 'Owner WhatsApp')}</h3>
          
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#4b2417]">{t('whatsapp.owner_phone', 'Owner WhatsApp Number')}</p>
                <p className="text-sm text-gray-700 mt-1">{ownerProfile?.phone_number || '—'}</p>
                
                <div className="mt-2 flex items-center gap-2 text-sm text-green-700">
                  <span className="flex items-center justify-center bg-green-100 text-green-700 rounded-full h-5 w-5">✓</span>
                  <span className="font-semibold">{t('whatsapp.registered_owner', 'Registered Owner')}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('whatsapp.owner_recognition_info', 'Messages from this registered Owner number can be recognized by the chatbot as Owner.')}
                </p>
              </div>
              
              <button
                onClick={() => setIsEditingOwnerPhone(true)}
                className="shrink-0 rounded-lg border border-[#d0bfaf] px-4 py-2 text-sm font-semibold text-[#d85b30] hover:bg-gray-50"
              >
                {t('whatsapp.change_owner_number', 'Change Owner Number')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <ConfirmationModal
        isOpen={showConfirm}
        title={t('whatsapp.confirm_change_chatbot_title', 'Confirm Change Chatbot Number')}
        message={t('whatsapp.confirm_change_chatbot_desc', 'Are you sure you want to change the WhatsApp number? This will disconnect the current number.')}
        confirmText={t('whatsapp.btn_yes_change', 'Yes, Change Number')}
        cancelText={t('whatsapp.btn_cancel', 'Cancel')}
        onConfirm={handleResetChatbot}
        onCancel={() => setShowConfirm(false)}
        isDestructive={false}
      />
      
      {/* OWNER PHONE EDIT MODAL */}
      <SellerModal
        isOpen={isEditingOwnerPhone}
        onClose={() => {
          setIsEditingOwnerPhone(false);
          setOwnerPhoneInput(ownerProfile?.phone_number || '');
          setOwnerPhoneError(null);
        }}
        title={t('whatsapp.change_owner_number', 'Change Owner Number')}
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => {
                setIsEditingOwnerPhone(false);
                setOwnerPhoneInput(ownerProfile?.phone_number || '');
                setOwnerPhoneError(null);
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t('whatsapp.btn_cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSaveOwnerPhone}
              disabled={isSavingOwnerPhone}
              className="rounded-lg bg-[#d85b30] px-6 py-2 text-sm font-semibold text-white hover:bg-[#c04e28] disabled:opacity-50"
            >
              {isSavingOwnerPhone ? '...' : t('whatsapp.save', 'Save')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {ownerPhoneError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {ownerPhoneError}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-[#4b2417] mb-1">
              {t('whatsapp.owner_phone', 'Owner WhatsApp Number')}
            </label>
            <input
              type="tel"
              value={ownerPhoneInput}
              onChange={(e) => setOwnerPhoneInput(e.target.value)}
              placeholder="e.g., 628123456789"
              className="w-full rounded-lg border border-[#d0bfaf] px-4 py-2 outline-none focus:border-[#d85b30]"
            />
          </div>
          <p className="text-xs text-gray-500">
             {t('whatsapp.owner_recognition_info', 'Messages from this registered Owner number can be recognized by the chatbot as Owner.')}
          </p>
        </div>
      </SellerModal>

    </div>
  );
}
// ============================================================
// KOMPONEN UTAMA SETTINGS
// ============================================================

type SettingsTab = 'profile' | 'users' | 'whatsapp';

export default function SellerSettingsPage() {
  const { user: currentUser } = useAuth();
  const isStaff = currentUser?.role === 'staff';

  const tabs = [
    { key: 'profile' as const, label: 'My Profile', icon: User },
    { key: 'users' as const, label: 'Users', icon: Users },
    ...(!isStaff ? [{ key: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle }] : [])
  ];

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-xl bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </div>

      <div>
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'whatsapp' && <WhatsAppTab />}
      </div>
    </div>
  );
}
