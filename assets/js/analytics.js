/* Google Analytics 4 — inert until a real Measurement ID is set below.
   Get the ID in analytics.google.com → Admin → Data streams → your web stream
   (it looks like G-ABC123DEF4), paste it here, and deploy. */
(function () {
  "use strict";
  var GA_ID = "G-0DJ7TNBKVQ";

  if (!/^G-[A-Z0-9]{8,}$/.test(GA_ID) || GA_ID === "G-XXXXXXXXXX") return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID, { anonymize_ip: true, allow_google_signals: false });

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);

  /* enquiry events: calls, WhatsApp, emails and the trip form */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href");
    if (h.indexOf("tel:") === 0) gtag("event", "click_call", { link_url: h });
    else if (h.indexOf("wa.me") !== -1) gtag("event", "click_whatsapp");
    else if (h.indexOf("mailto:") === 0) gtag("event", "click_email");
  });
  document.addEventListener("submit", function (e) {
    if (e.target && e.target.hasAttribute("data-trip-form")) gtag("event", "generate_lead", { form: "trip_enquiry" });
  });
})();
