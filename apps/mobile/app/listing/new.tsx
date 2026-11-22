import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { Camera, ImagePlus, Sparkles, X } from 'lucide-react-native';
import { C, F, R } from '@/theme/tokens';
import { ENV } from '@/config/env';
import { useCreateListing, useListing, useUpdateListing } from '@/features/hooks';
import { CURRENCY_SYMBOLS, parseMoneyInput } from '@/lib/money';
import { captureImageFromCamera, pickImageFromGallery, uploadPhotoToMudra } from '@/lib/upload';
import { useSessionStore } from '@/state/session';
import type { ListingCategory, ListingCondition, ListingKind } from '@/types';
import {
  Eyebrow, ListGroup, ListRow, NeoButton, SegmentedControl,
  Sheet, Text, TopBar, showToast,
} from '@/ui';

const CATEGORIES: ListingCategory[] = [
  'books', 'electronics', 'phones', 'home', 'rides',
  'fashion', 'sports', 'hobbies', 'tickets', 'other',
];

const SAMPLE_SEED_IDS = [
  '1505740420928-5e560c06d30e',
  '1512820790803-83ca734da794',
  '1485965120184-e220f721d03e',
  '1511707171634-5f897ff02aa9',
];

export default function CreateEditListingScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const me = useSessionStore((s) => s.me);
  const draftListing = useSessionStore((s) => s.draftListing);
  const saveDraft = useSessionStore((s) => s.saveDraft);

  const editQuery = useListing(edit);
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();

  const [title, setTitle] = useState(draftListing?.title || '');
  const [description, setDescription] = useState(draftListing?.description || '');
  const [category, setCategory] = useState<ListingCategory>(draftListing?.category || 'electronics');
  const [condition, setCondition] = useState<ListingCondition>(draftListing?.condition || 'good');
  const [kind, setKind] = useState<ListingKind>(draftListing?.kind || 'sell');
  const [priceInput, setPriceInput] = useState(draftListing?.priceInput || '');
  const [photos, setPhotos] = useState<string[]>(draftListing?.photos || []);
  const [meetupSpot, setMeetupSpot] = useState(draftListing?.meetup_spot || '');
  const [campus, setCampus] = useState(draftListing?.campus || me?.campus || 'IIT Bombay');
  const [uploading, setUploading] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  useEffect(() => {
    if (edit && editQuery.data) {
      const d = editQuery.data;
      setTitle(d.title);
      setDescription(d.description || '');
      setCategory(d.category);
      setCondition(d.condition);
      setKind(d.kind);
      setPriceInput(d.price_minor > 0 ? String(d.price_minor / 100) : '');
      setPhotos(d.photos?.length ? d.photos : d.photo ? [d.photo] : []);
      setMeetupSpot(d.meetup_spot || '');
      setCampus(d.campus || me?.campus || 'IIT Bombay');
    }
  }, [edit, editQuery.data, me?.campus]);

  useEffect(() => {
    if (edit) return;
    const timer = setTimeout(() => {
      saveDraft({
        title, description, category, condition, kind,
        priceInput, photos, meetup_spot: meetupSpot, campus,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [edit, title, description, category, condition, kind, priceInput, photos, meetupSpot, campus, saveDraft]);

  const handlePickPhoto = async (source: 'camera' | 'gallery' | 'sample') => {
    setPhotoSheetOpen(false);
    if (photos.length >= 6) return;

    if (source === 'sample') {
      const seedId = SAMPLE_SEED_IDS[photos.length % SAMPLE_SEED_IDS.length];
      const publicUrl = `${ENV.SUPABASE_URL}/storage/v1/object/public/mudra-photos/seed/${seedId}.jpg`;
      setPhotos((prev) => [...prev, publicUrl]);
      return;
    }

    setUploading(true);
    try {
      const localUri = source === 'camera' ? await captureImageFromCamera() : await pickImageFromGallery();
      if (!localUri) return;
      const publicUrl = await uploadPhotoToMudra(localUri, 'listings');
      setPhotos((prev) => [...prev, publicUrl]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('errors.UNKNOWN'), 'danger');
    } finally {
      setUploading(false);
    }
  };

  const priceMinor = kind === 'sell' ? parseMoneyInput(priceInput) : 0;
  const isValid =
    title.trim().length >= 3 &&
    title.trim().length <= 60 &&
    photos.length >= 1 &&
    (kind !== 'sell' || priceMinor > 0);

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        kind,
        price_minor: priceMinor,
        photos,
        meetup_spot: meetupSpot.trim() || 'library gate',
        campus: campus.trim() || me?.campus || 'IIT Bombay',
      };

      if (edit) {
        const updated = await updateListing.mutateAsync({ listingId: edit, patch: payload });
        showToast(t('common.save'), 'success');
        router.replace(`/listing/${updated.id}` as never);
      } else {
        const created = await createListing.mutateAsync(payload);
        showToast(t('listing.listed_toast'), 'success');
        router.replace(`/listing/${created.id}` as never);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('errors.UNKNOWN'), 'danger');
    }
  };

  const currencySymbol = CURRENCY_SYMBOLS[me?.currency || 'INR'] || '₹';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <TopBar title={edit ? t('listing.edit_title') : t('listing.new_title')} />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Eyebrow label={t('listing.add_photos').toUpperCase()} dot />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
          {photos.length < 6 ? (
            <Pressable accessibilityRole="button" onPress={() => setPhotoSheetOpen(true)} style={styles.addPhotoTile}>
              {uploading ? (
                <ActivityIndicator color={C.paccha} />
              ) : (
                <>
                  <ImagePlus size={24} strokeWidth={1.75} color={C.paccha} />
                  <Text size={11} weight={600} color={C.fg2}>{t('listing.add_photos')}</Text>
                </>
              )}
            </Pressable>
          ) : null}

          {photos.map((uri, idx) => (
            <View key={`${uri}-${idx}`} style={styles.photoThumbWrap}>
              <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
              <Pressable onPress={() => setPhotos((p) => p.filter((_, i) => i !== idx))} style={styles.removeBtn}>
                <X size={14} color={C.fg} />
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <View style={styles.fieldGroup}>
          <Eyebrow label={t('listing.field_title').toUpperCase()} />
          <TextInput maxLength={60} placeholder={t('listing.field_title_placeholder')} placeholderTextColor={C.dim} value={title} onChangeText={setTitle} style={styles.input} />
        </View>

        <View style={styles.fieldGroup}>
          <Eyebrow label={t('listing.field_kind').toUpperCase()} />
          <SegmentedControl
            value={kind}
            onChange={setKind}
            options={[
              { value: 'sell', label: t('kinds.sell') },
              { value: 'swap', label: t('kinds.swap') },
              { value: 'free', label: t('kinds.free') },
            ]}
          />
        </View>

        {kind === 'sell' ? (
          <View style={styles.fieldGroup}>
            <Eyebrow label={`${t('listing.field_price').toUpperCase()} (${currencySymbol})`} />
            <TextInput keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.dim} value={priceInput} onChangeText={setPriceInput} style={styles.input} />
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Eyebrow label={t('listing.field_category').toUpperCase()} />
          <View style={styles.chipsWrap}>
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.catChip, active && styles.catChipActive]}>
                  <Text weight={600} size={13} color={active ? C.bg : C.fg2}>{t(`categories.${cat}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Eyebrow label={t('listing.field_condition').toUpperCase()} />
          <SegmentedControl
            value={condition}
            onChange={setCondition}
            options={[
              { value: 'new', label: t('conditions.new') },
              { value: 'like_new', label: t('conditions.like_new') },
              { value: 'good', label: t('conditions.good') },
              { value: 'fair', label: t('conditions.fair') },
            ]}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Eyebrow label={t('listing.field_description').toUpperCase()} />
          <TextInput multiline maxLength={500} placeholder={t('listing.field_description_placeholder')} placeholderTextColor={C.dim} value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} />
        </View>

        <View style={styles.fieldGroup}>
          <Eyebrow label={t('listing.field_meetup').toUpperCase()} />
          <TextInput maxLength={80} placeholder={t('listing.field_meetup_placeholder')} placeholderTextColor={C.dim} value={meetupSpot} onChangeText={setMeetupSpot} style={styles.input} />
        </View>

        <View style={styles.fieldGroup}>
          <Eyebrow label={t('listing.field_campus').toUpperCase()} />
          <TextInput maxLength={60} placeholder="IIT Bombay" placeholderTextColor={C.dim} value={campus} onChangeText={setCampus} style={styles.input} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <NeoButton
          variant="paccha"
          size="lg"
          label={edit ? t('listing.save_changes') : t('listing.post_listing')}
          disabled={!isValid || uploading}
          loading={createListing.isPending || updateListing.isPending}
          onPress={handleSubmit}
        />
      </View>

      <Sheet visible={photoSheetOpen} onClose={() => setPhotoSheetOpen(false)} title={t('listing.add_photos')}>
        <ListGroup>
          <ListRow icon={<Camera size={18} color={C.fg} />} title={t('listing.camera')} onPress={() => handlePickPhoto('camera')} />
          <ListRow icon={<ImagePlus size={18} color={C.fg} />} title={t('listing.gallery')} onPress={() => handlePickPhoto('gallery')} />
          <ListRow icon={<Sparkles size={18} color={C.paccha} />} title="use sample campus photo" subtitle={t('common.simulated')} onPress={() => handlePickPhoto('sample')} />
        </ListGroup>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 18, paddingBottom: 36 },
  photosRow: { gap: 12, paddingVertical: 4 },
  addPhotoTile: {
    width: 96, height: 96, borderRadius: 18, backgroundColor: C.card2,
    borderWidth: 1.5, borderColor: C.paccha, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoThumbWrap: { width: 96, height: 96, borderRadius: 18, overflow: 'hidden' },
  photoThumb: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24,
    borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center',
  },
  fieldGroup: { gap: 8 },
  input: {
    height: 52, backgroundColor: C.card2, borderRadius: 16, borderWidth: 1,
    borderColor: C.border, paddingHorizontal: 16, fontFamily: F.ui, fontSize: 16, color: C.fg,
  },
  textArea: { height: 96, paddingTop: 12, textAlignVertical: 'top' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    height: 34, paddingHorizontal: 14, borderRadius: R.chip, backgroundColor: C.card2,
    borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center',
  },
  catChipActive: { backgroundColor: C.paccha, borderColor: C.paccha },
  bottomBar: { backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.hairline, paddingHorizontal: 16, paddingTop: 12 },
});
