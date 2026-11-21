import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { newIdemKey } from '@/lib/idem';
import { MudraError } from '@/lib/errors';

export type PhotoFolder = 'listings' | 'evidence' | 'avatars';

/**
 * Opens the device photo library to pick 1 image. Returns local URI or null if cancelled.
 */
export async function pickImageFromGallery(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new MudraError('FORBIDDEN', 'photo library permission is required');
  }

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (res.canceled || !res.assets?.length) {
    return null;
  }
  return res.assets[0].uri;
}

/**
 * Opens the system camera to capture a photo. Returns local URI or null if cancelled.
 */
export async function captureImageFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new MudraError('FORBIDDEN', 'camera permission is required');
  }

  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (res.canceled || !res.assets?.length) {
    return null;
  }
  return res.assets[0].uri;
}

async function resizeImageToJpeg(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
}

async function readUriBytes(uri: string): Promise<Uint8Array | ArrayBuffer> {
  try {
    const file = new File(uri);
    const bytes = await file.bytes();
    if (bytes && bytes.byteLength > 0) {
      return bytes;
    }
  } catch {
    // Fallback to fetch(uri).arrayBuffer() per §17 risk register
  }

  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Resizes image to max 1280px JPEG (0.75 quality), reads bytes via expo-file-system File.bytes()
 * (with fetch arrayBuffer fallback), uploads to `mudra-photos` bucket, and returns the public URL (§3 ADR-M7).
 */
export async function uploadPhotoToMudra(
  uri: string,
  folder: PhotoFolder = 'listings',
  subPath?: string
): Promise<string> {
  if (!uri) {
    throw new MudraError('VALIDATION', 'missing photo uri');
  }

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  const manipulatedUri = await resizeImageToJpeg(uri);
  const bytes = await readUriBytes(manipulatedUri);
  const filename = subPath
    ? `${folder}/${subPath.replace(/^\/+/, '')}`
    : `${folder}/${newIdemKey()}.jpg`;

  const { error } = await supabase.storage.from('mudra-photos').upload(filename, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw new MudraError('UNKNOWN', error.message || 'failed to upload photo');
  }

  const { data } = supabase.storage.from('mudra-photos').getPublicUrl(filename);
  return data.publicUrl;
}
