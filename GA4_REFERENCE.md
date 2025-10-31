# GA4 Configuration Reference

## Shop Measurement IDs

### VikGinChoice (vikginchoice.nl)
- **Measurement ID:** `G-P6152QHNZ6`
- **Current gtag.js:** ✅ Installed
- **Currency:** EUR
- **Country:** NL

### Retoertje (retoertje.nl)
- **Measurement ID:** `G-NBZL3D7WK8`
- **Current gtag.js:** ✅ Installed
- **Currency:** EUR
- **Country:** NL

---

## Current GA4 Scripts

### VikGinChoice Script
```html
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-P6152QHNZ6"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}

    gtag('consent', 'default', {
        "ad_storage":"granted",
        "ad_user_data":"granted",
        "ad_personalization":"granted",
        "analytics_storage":"granted"
    });

    gtag('js', new Date());
    gtag('config', 'G-P6152QHNZ6', {
        'currency': 'EUR',
        'country': 'NL'
    });
</script>
```

### Retoertje Script
```html
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-NBZL3D7WK8"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}

    gtag('consent', 'default', {
        "ad_storage":"granted",
        "ad_user_data":"granted",
        "ad_personalization":"granted",
        "analytics_storage":"granted"
    });

    gtag('js', new Date());
    gtag('config', 'G-NBZL3D7WK8', {
        'currency': 'EUR',
        'country': 'NL'
    });
</script>
```

---

## What's Next: Generate API Secrets

To enable GA4 Measurement Protocol (server-side tracking), you need to generate an **API Secret** for each property.

### How to Generate API Secrets:

#### For VikGinChoice (G-P6152QHNZ6):
1. Go to: https://analytics.google.com/
2. Select **VikGinChoice** property
3. Click **Admin** (⚙️ bottom left)
4. Under **Data Collection and Modification** → **Data Streams**
5. Click on the web stream for **vikginchoice.nl**
6. Scroll down to **Measurement Protocol API secrets**
7. Click **Create**
8. Give it a name: `Lightspeed CAPI Worker`
9. Click **Create**
10. **Copy the Secret Value** → Save it securely!

#### For Retoertje (G-NBZL3D7WK8):
1. Repeat steps above for **Retoertje** property
2. Save the API Secret

---

## API Secrets ✅ GENERATED

### VikGinChoice
- Measurement ID: `G-P6152QHNZ6`
- API Secret: `eOcRAFvyR-mRORq7_MrhFw`
- Secret Name: `Lightspeed CAPI Worker`

### Retoertje
- Measurement ID: `G-NBZL3D7WK8`
- API Secret: `A0QeDogmTIOczyXBymszLw`
- Secret Name: `Lightspeed CAPI Worker`

---

## Notes

- ✅ Both shops already have gtag.js installed (good for deduplication!)
- ✅ Consent mode configured (ad_storage, analytics_storage granted)
- ⚠️ Need to add purchase event tracking on thank-you pages
- ⚠️ Need to extract `client_id` from `_ga` cookie for deduplication

---

**Status:** Waiting for API Secrets to proceed with Measurement Protocol implementation.
**Last Updated:** 2025-10-29
