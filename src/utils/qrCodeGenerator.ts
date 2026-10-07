import QRCode from 'qrcode';
import { MAX_GEOFENCE_RADIUS_METERS } from './haversine';

export const MAX_QR_DURATION_MINUTES = 120;

export interface QRPayload {
  sessionId: string;
  token: string;
  expiresAt: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  department: string;
  title: string;
}

/**
 * Generates an encrypted/tokenized QR JSON string
 */
export function createQRPayload(
  sessionId: string,
  title: string,
  department: string,
  latitude: number,
  longitude: number,
  radiusMeters: number,
  durationMinutes: number,
  startsAt?: number
): { rawPayload: QRPayload; qrString: string; expiresAt: number } {
  // Honour the admin-selected start time when provided, otherwise start now.
  const timestamp = startsAt !== undefined && Number.isFinite(startsAt) ? startsAt : Date.now();
  const boundedDurationMinutes = Number.isFinite(durationMinutes)
    ? Math.min(Math.max(Math.floor(durationMinutes), 1), MAX_QR_DURATION_MINUTES)
    : 1;
  const expiresAt = timestamp + boundedDurationMinutes * 60 * 1000;
  
  // Create unique obfuscated token hash
  const secretKey = `IT_DEPT_SECURE_${sessionId}_${timestamp}`;
  const token = btoa(`${sessionId}:${expiresAt}:${secretKey}`).slice(0, 32);

  const rawPayload: QRPayload = {
    sessionId,
    title,
    department,
    latitude,
    longitude,
    radiusMeters,
    expiresAt,
    timestamp,
    token
  };

  return {
    rawPayload,
    qrString: JSON.stringify(rawPayload),
    expiresAt
  };
}

/**
 * Renders a QR code data URL image from text string
 */
export async function generateQRDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
  } catch (err) {
    console.error('Failed to generate QR Code Data URL', err);
    throw err;
  }
}

/**
 * Parses and validates scanned QR payload
 */
export function parseAndValidateQRPayload(qrText: string): {
  valid: boolean;
  payload?: QRPayload;
  error?: string;
} {
  try {
    const raw: unknown = JSON.parse(qrText);

    if (typeof raw !== 'object' || raw === null) {
      return { valid: false, error: 'Invalid QR Code structure. Missing required security metadata.' };
    }

    const candidate = raw as Record<string, unknown>;

    const isNonEmptyString = (v: unknown): v is string =>
      typeof v === 'string' && v.trim().length > 0;

    if (
      !isNonEmptyString(candidate.sessionId) ||
      !isNonEmptyString(candidate.token) ||
      typeof candidate.timestamp !== 'number' ||
      !Number.isFinite(candidate.timestamp) ||
      typeof candidate.expiresAt !== 'number' ||
      !Number.isFinite(candidate.expiresAt)
    ) {
      return { valid: false, error: 'Invalid QR Code structure. Missing required security metadata.' };
    }

    if (typeof candidate.latitude !== 'number' || !Number.isFinite(candidate.latitude) ||
        typeof candidate.longitude !== 'number' || !Number.isFinite(candidate.longitude) ||
        typeof candidate.radiusMeters !== 'number' || !Number.isFinite(candidate.radiusMeters) ||
        candidate.latitude < -90 || candidate.latitude > 90 ||
        candidate.longitude < -180 || candidate.longitude > 180 ||
        candidate.radiusMeters < 1 || candidate.radiusMeters > MAX_GEOFENCE_RADIUS_METERS) {
      return { valid: false, error: 'Invalid QR Code geofence data. Please ask the admin for a new session.' };
    }

    if (Date.now() > candidate.expiresAt) {
      return { valid: false, error: 'This QR Code session has expired. Please ask the admin for a new session.' };
    }

    return {
      valid: true,
      payload: {
        sessionId: candidate.sessionId,
        token: candidate.token,
        timestamp: candidate.timestamp,
        expiresAt: candidate.expiresAt,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        radiusMeters: candidate.radiusMeters,
        department: typeof candidate.department === 'string' ? candidate.department : '',
        title: typeof candidate.title === 'string' ? candidate.title : ''
      }
    };
  } catch {
    return { valid: false, error: 'Unrecognized QR Code format. Please scan an official Staff Attendance QR.' };
  }
}
