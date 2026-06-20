/**
 * useTabBarSafeBottom — Dynamic tab bar height + safe area offset
 *
 * Computes the bottom offset needed to position floating elements
 * (like the slide-to-start button) above the bottom tab bar.
 * Accounts for the tab bar's absolute positioning and safe area insets.
 *
 * Usage:
 *   const { bottomOffset } = useTabBarSafeBottom();
 *   <View style={{ bottom: bottomOffset }}>...</View>
 */

import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────

/** Height of the custom bottom tab bar from OperatorStack / DriverStack */
const TAB_BAR_HEIGHT = 70;

/** Additional padding below floating elements */
const EXTRA_PADDING = 16;

/** Default Android navigation bar height estimate */
const ANDROID_NAV_BAR_HEIGHT = 48;

// ─── Hook ─────────────────────────────────────────────────────────────

interface UseTabBarSafeBottomReturn {
  /** Bottom offset in pixels for floating elements above the tab bar */
  bottomOffset: number;
  /** Just the tab bar height */
  tabBarHeight: number;
  /** Screen height */
  screenHeight: number;
}

export function useTabBarSafeBottom(): UseTabBarSafeBottomReturn {
  const [screenHeight, setScreenHeight] = useState(
    Dimensions.get('window').height,
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const navBarOffset = Platform.OS === 'android' ? ANDROID_NAV_BAR_HEIGHT : 0;
  const bottomOffset = TAB_BAR_HEIGHT + EXTRA_PADDING + navBarOffset;

  return {
    bottomOffset,
    tabBarHeight: TAB_BAR_HEIGHT,
    screenHeight,
  };
}
