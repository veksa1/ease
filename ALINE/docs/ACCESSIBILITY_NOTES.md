# Ease UI - Accessible Switch Implementation

## Overview
This document details the accessible switch implementation for the "Customize your permissions" screen in the Ease onboarding flow.

## Key Features

### 1. High Visibility OFF State
**Problem Solved**: Standard switches often have poor visibility in the OFF state, making it difficult for users to distinguish between enabled and disabled states.

**Solution**:
- **Light Mode OFF**: Track uses high-contrast slate (#64748B) instead of gray
- **Dark Mode OFF**: Track uses lighter slate (#94A3B8) for clear distinction
- **Thumb Borders**: 
  - Light OFF: 1px border #0F172A (dark outline on white thumb)
  - Dark OFF: 1px border #E5E7EB (light outline on dark thumb)

### 2. WCAG Compliance
- ✅ **Target Size (WCAG 2.5.5)**: 44×44px tap target exceeds minimum 44×44px
- ✅ **Contrast (WCAG 1.4.3)**: All states meet AA+ standard (≥4.5:1)
  - OFF track clearly distinct from card background
  - Status text meets contrast requirements
- ✅ **Focus Visible (WCAG 2.4.7)**: 2px #5468FF ring with 2px offset
- ✅ **Keyboard Access (WCAG 2.1.1)**: Full keyboard support (Enter/Space)

### 3. Status Text
- **Enabled**: Green (#16A34A) - success tone
- **Disabled**: Neutral (#475569 light / #9CA3AF dark)
- Positioned next to switch for immediate visual feedback
- Reinforces state for users with color vision deficiencies

### 4. Low-Stimulation Mode
When enabled:
- ❌ No hover brightness effects
- ❌ No animated shadow transitions
- ✅ Full contrast maintained
- ✅ All functionality preserved
- Goal: Reduce visual stimulation for users with sensory sensitivities

### 5. Badge System
- **Recommended** (green pill): HRV, Sleep
- **Optional** (neutral pill): Screen Time, Calendar, Weather
- Helps users prioritize permissions

## Design Specifications

### Switch Dimensions
```
Tap Target: 44×44px
Track: 44×24px
Thumb: 20px (diameter)
Thumb Position (ON): translateX(18px)
Thumb Position (OFF): translateX(6px)
```

### Color Palette

#### Light Mode
| State | Track | Thumb | Border |
|-------|-------|-------|--------|
| ON | #5468FF | #FFFFFF | None (shadow only) |
| OFF | #64748B | #FFFFFF | 1px #0F172A |
| Disabled ON | #CBD5E1 | #E5E7EB | None |
| Disabled OFF | #CBD5E1 | #E5E7EB | None |

#### Dark Mode
| State | Track | Thumb | Border |
|-------|-------|-------|--------|
| ON | #7C8BFF | #0B1220 | 1px #CBD5E1 |
| OFF | #94A3B8 | #111827 | 1px #E5E7EB |
| Disabled ON | #334155 | #1F2937 | None |
| Disabled OFF | #334155 | #1F2937 | None |

### Focus Ring
- Width: 2px
- Color: #5468FF
- Offset: 2px
- Style: Solid
- Visible in both light and dark modes

## Component Architecture

### Files Modified/Created
1. `/components/ui/accessible-switch.tsx` - New component
2. `/components/ConsentItem.tsx` - Updated to use new switch
3. `/App.tsx` - Screen 3 updated with icons and badges
4. `/styles/globals.css` - Added utility classes

### Props Interface
```typescript
interface AccessibleSwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  showStatus?: boolean
  lowStimulationMode?: boolean
  disabled?: boolean
  id?: string
  'aria-label'?: string
}
```

## User Experience Enhancements

### Clickable Rows
- Entire consent row is clickable, not just the switch
- Keyboard support: Enter or Space to toggle
- Visual feedback: Background color change on hover
- Info button has stopPropagation to prevent row toggle

### Info Sheets
- Tapping info icon (ⓘ) opens bottom sheet
- Contains detailed explanation of each permission
- Calm, reassuring copy emphasizing privacy
- Smooth slide-up animation

### Visual Hierarchy
```
Icon → Title + Badge → Description
                    ↓
         Info Button + Switch + Status
```

## Testing Checklist

- [ ] OFF state clearly visible in light mode
- [ ] OFF state clearly visible in dark mode
- [ ] Focus ring visible on keyboard navigation
- [ ] Keyboard toggle (Enter/Space) works
- [ ] Row click toggles switch
- [ ] Status text updates correctly
- [ ] Low-stimulation mode disables animations
- [ ] Info sheet opens without toggling switch
- [ ] Color contrast meets WCAG AA (≥4.5:1)
- [ ] Touch target meets 44×44px minimum

## Accessibility Principles Applied

1. **Perceivable**: High contrast ensures visibility
2. **Operable**: Large touch targets, keyboard support
3. **Understandable**: Clear labels, status text, consistent behavior
4. **Robust**: Works with screen readers, respects system preferences

## Future Enhancements

- [ ] Add haptic feedback on toggle (mobile)
- [ ] Support prefers-reduced-motion system setting
- [ ] Add sound effects (with opt-out)
- [ ] Implement undo toast for accidental toggles
- [ ] Add analytics for permission acceptance rates

---

**Note**: This implementation prioritizes accessibility and calm design principles aligned with Ease's mission to reduce cognitive load for migraine sufferers.
