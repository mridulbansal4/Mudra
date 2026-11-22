import { formatMoney } from '@/lib/money';
import { formatCountdown } from '@/lib/time';
import type { Deal } from '@/types';

export type NextStepActionType =
  | 'ACCEPT'
  | 'CANCEL'
  | 'OPEN_ESCROW'
  | 'START_ASSAY'
  | 'CHOOSE_IN_PERSON'
  | 'CONFIRM_IN_PERSON'
  | 'OPEN_INSPECT'
  | 'MARK_VERIFIED'
  | 'OPEN_RECEIPT'
  | 'OPEN_FREEZE'
  | 'OPEN_REVIEW'
  | 'BROWSE_SIMILAR';

export interface NextStepDescriptor {
  sentence: string;
  buttonLabel?: string;
  actionType?: NextStepActionType;
}

/**
 * Computes the exact 1-sentence guidance and primary CTA for the Deal Room NextStepBar (§8.4).
 */
export function getDealNextStep(deal: Deal, locale: string = 'en-IN'): NextStepDescriptor {
  const name = (deal.counterpart?.name || 'them').split(' ')[0].toLowerCase();
  const isBuyer = deal.my_role === 'buyer';
  const priceText =
    deal.kind === 'free'
      ? 'free'
      : deal.kind === 'swap' && deal.amount_minor === 0
        ? deal.swap_offer || 'swap'
        : formatMoney(deal.amount_minor, deal.currency, locale);

  switch (deal.state) {
    case 'OFFERED': {
      if (deal.offer_by_me) {
        return {
          sentence: `waiting for ${name} to respond.`,
          buttonLabel: 'cancel offer',
          actionType: 'CANCEL',
        };
      }
      if (isBuyer) {
        return {
          sentence: `${name} countered ${priceText}.`,
          buttonLabel: 'accept',
          actionType: 'ACCEPT',
        };
      }
      return {
        sentence: `${name} offered ${priceText}.`,
        buttonLabel: 'accept',
        actionType: 'ACCEPT',
      };
    }

    case 'CREATED': {
      if (isBuyer) {
        return {
          sentence: `lock ${priceText} in escrow so ${name} knows you're serious.`,
          buttonLabel: 'lock money',
          actionType: 'OPEN_ESCROW',
        };
      }
      return {
        sentence: `waiting for ${name} to lock the money.`,
      };
    }

    case 'FUNDED': {
      if (deal.inspection_mode === 'in_person') {
        if (isBuyer) {
          return {
            sentence: "after you've met and checked it:",
            buttonLabel: "confirm it's good",
            actionType: 'CONFIRM_IN_PERSON',
          };
        }
        const spot = (deal.listing?.meetup_spot || deal.listing?.campus || 'campus').toLowerCase();
        return {
          sentence: `meet ${name} at ${spot}. they'll confirm in the app.`,
        };
      }

      if (isBuyer) {
        return {
          sentence: "money's locked. ask for a live check, or meet in person.",
          buttonLabel: "i'll check in person",
          actionType: 'CHOOSE_IN_PERSON',
        };
      }
      return {
        sentence: "money's locked. show the item live.",
        buttonLabel: 'start live check',
        actionType: 'START_ASSAY',
      };
    }

    case 'INSPECTION_LIVE': {
      const checklist = Array.isArray(deal.checklist) ? deal.checklist : [];
      const total = checklist.length || 3;
      const doneCount = checklist.filter((c) => Boolean(c?.photo_url)).length;

      if (isBuyer) {
        return {
          sentence: `${doneCount}/${total} checks in. happy?`,
          buttonLabel: 'mark verified',
          actionType: 'MARK_VERIFIED',
        };
      }

      const nextIndex = checklist.findIndex((c) => !c?.photo_url);
      if (nextIndex === -1) {
        return {
          sentence: 'all checks sent. waiting for the buyer.',
          buttonLabel: 'open camera',
          actionType: 'OPEN_INSPECT',
        };
      }
      const nextLabel = (checklist[nextIndex]?.label || 'next detail').toLowerCase();
      return {
        sentence: `show check ${nextIndex + 1}: ${nextLabel}`,
        buttonLabel: 'open camera',
        actionType: 'OPEN_INSPECT',
      };
    }

    case 'ASSAY_VERIFIED': {
      if (isBuyer) {
        return {
          sentence: `all good? release the money to ${name}.`,
          buttonLabel: deal.amount_minor > 0 ? 'release money' : 'complete deal',
          actionType: 'OPEN_RECEIPT',
        };
      }
      return {
        sentence: `verified. waiting for ${name} to release.`,
        buttonLabel: 'view receipt',
        actionType: 'OPEN_RECEIPT',
      };
    }

    case 'DISPUTED_FROZEN': {
      const cd = deal.freeze_ends_at
        ? formatCountdown(deal.freeze_ends_at).formatted
        : '0:00';
      return {
        sentence: `frozen. resolution in ${cd}.`,
        buttonLabel: 'open resolution desk',
        actionType: 'OPEN_FREEZE',
      };
    }

    case 'RELEASED': {
      if (isBuyer) {
        return {
          sentence: `done. how was ${name}?`,
          buttonLabel: deal.reviewed_by_me ? 'view receipt' : 'leave a review',
          actionType: deal.reviewed_by_me ? 'OPEN_RECEIPT' : 'OPEN_REVIEW',
        };
      }
      return {
        sentence:
          deal.amount_minor > 0
            ? `${priceText} added to your wallet.`
            : `done. how was ${name}?`,
        buttonLabel: deal.reviewed_by_me ? 'view receipt' : 'leave a review',
        actionType: deal.reviewed_by_me ? 'OPEN_RECEIPT' : 'OPEN_REVIEW',
      };
    }

    case 'ARBITRATED_SPLIT':
    case 'REFUNDED': {
      const verdictShort =
        deal.state === 'REFUNDED' || deal.verdict?.buyer_pct === 100
          ? 'full refund'
          : deal.verdict
            ? `${deal.verdict.seller_pct}/${deal.verdict.buyer_pct} split`
            : 'fair split';
      return {
        sentence: `resolved: ${verdictShort}.`,
        buttonLabel: 'view verdict',
        actionType: 'OPEN_FREEZE',
      };
    }

    case 'DECLINED':
    case 'CANCELLED':
    default: {
      if (isBuyer) {
        return {
          sentence: 'this deal is closed.',
          buttonLabel: 'browse similar',
          actionType: 'BROWSE_SIMILAR',
        };
      }
      return {
        sentence: 'this deal is closed.',
      };
    }
  }
}
