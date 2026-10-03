/* ============================================================================
   Eatswada Vendor — centralized API configuration
   ----------------------------------------------------------------------------
   The ONLY place a backend host is defined. No page hardcodes a URL.

   Active host: RENDER (testing stage).
   To switch hosts later, change ACTIVE_API in ONE line.
   No silent fallback: if the selected host is empty the portal fails loudly
   via EATSWADA_CONFIG.CONFIG_ERROR instead of quietly calling another host.
   ============================================================================ */
(function () {
  'use strict';

  // ---- Host slots --------------------------------------------------------
  // Render is the only API host used by the vendor frontend.
  var RENDER_API_ORIGIN = window.EATSWADA_RENDER_ORIGIN || 'https://eatswada.onrender.com';

  // ---- Active-host switch (ONE line) ------------------------------------
  // 'render' is the only supported value in this build.
  var ACTIVE_API = 'render';
  var SELECTED_API_ORIGIN = (ACTIVE_API === 'render') ? RENDER_API_ORIGIN : '';

  // ---- No silent fallback ------------------------------------------------
  var CONFIG_ERROR = null;
  if (!SELECTED_API_ORIGIN) {
    CONFIG_ERROR = 'ACTIVE_API="' + ACTIVE_API + '" is selected but its origin is not configured. ' +
      'Set RENDER_API_ORIGIN in config.js (or window.EATSWADA_RENDER_ORIGIN before this file loads). ' +
      'Refusing to fall back to another host.';
    try { console.error('[Eatswada config] ' + CONFIG_ERROR); } catch (e) {}
  }

  var API_ORIGIN = CONFIG_ERROR ? '' : String(SELECTED_API_ORIGIN).replace(/\/+$/, '');
  var API = API_ORIGIN ? API_ORIGIN + '/api' : '';

  window.EATSWADA_CONFIG = {
    ACTIVE_API: ACTIVE_API,
    CONFIG_ERROR: CONFIG_ERROR,

    API_ORIGIN: API_ORIGIN,
    API: API,
    API_BASE: API ? API + '/vendor' : '',
    AUTH_BASE: API ? API + '/auth' : '',
    APPLICATIONS_BASE: API ? API + '/vendor-applications' : '',
    NOTIFICATIONS_BASE: API ? API + '/notifications' : '',

    TOKEN_KEY: 'nearbite_vendor_token',
    USER_KEY: 'nearbite_vendor_user',
    RESTAURANT_KEY: 'nearbite_vendor_restaurant',
    POLL_INTERVAL: 15000,
    RENDER_ORIGIN: API_ORIGIN
  };
})();
