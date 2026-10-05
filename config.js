/* ============================================================================
   Eatswada Vendor — centralized API configuration
   ----------------------------------------------------------------------------
   The ONLY place a backend host is defined. No page hardcodes a URL.
   Active host: AWS production API.
   To switch hosts later, change ACTIVE_API in ONE line.
   ============================================================================ */
(function () {
  'use strict';

  // ---- Host slots --------------------------------------------------------
  var RENDER_API_ORIGIN = window.EATSWADA_RENDER_ORIGIN || 'https://eatswada.onrender.com';
  var AWS_API_ORIGIN = 'https://api.eatswada.com';

  // ---- Active-host switch (ONE line) ------------------------------------
  // 'render' | 'aws'
  var ACTIVE_API = 'aws';
  var SELECTED_API_ORIGIN = (ACTIVE_API === 'render') ? RENDER_API_ORIGIN : AWS_API_ORIGIN;

  // ---- No silent fallback ------------------------------------------------
  var CONFIG_ERROR = null;
  if (!SELECTED_API_ORIGIN) {
    CONFIG_ERROR = 'ACTIVE_API="' + ACTIVE_API + '" is selected but its origin is not configured.';
    try { console.error('[Eatswada config] ' + CONFIG_ERROR); } catch (e) {}
  }

  var API_ORIGIN = CONFIG_ERROR ? '' : String(SELECTED_API_ORIGIN).replace(/\/+$/, '');
  var API = API_ORIGIN ? API_ORIGIN + '/api' : '';

  window.EATSWADA_CONFIG = {
    API_ORIGIN: API_ORIGIN,
    ACTIVE_API: ACTIVE_API,
    CONFIG_ERROR: CONFIG_ERROR,
    API_BASE: API ? API + '/vendor' : '',
    AUTH_BASE: API ? API + '/auth' : '',
    APPLICATIONS_BASE: API ? API + '/vendor-applications' : '',
    NOTIFICATIONS_BASE: API ? API + '/notifications' : '',
    TOKEN_KEY: 'nearbite_vendor_token',
    USER_KEY: 'nearbite_vendor_user',
    RESTAURANT_KEY: 'nearbite_vendor_restaurant',
    POLL_INTERVAL: 15000
  };
})();
