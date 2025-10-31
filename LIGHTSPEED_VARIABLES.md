# Lightspeed eCom (C-Series) Rain Template Variables

## 📚 Documentation Source
- **Primary**: https://ecom-support.lightspeedhq.com/hc/en-us/articles/115000277594-3-b-Rain-variables
- **Tracking Codes**: https://ecom-support.lightspeedhq.com/hc/en-us/articles/220319768-Adding-a-web-tracking-code
- **Email Templates**: https://ecom-support.lightspeedhq.com/hc/en-us/articles/360016249154-Notification-email-templates

## 🎯 Order Variables (Thank You Page)

### Order Number
```liquid
{{ order.information.number }}
```
**Returns**: String order number (e.g., "VKNG187001", "RTR16873")

**Usage**: Available on the thank you page after order completion

**Example**:
```javascript
var ORDER_ID = '{{ order.information.number }}';
```

### Order Products Loop
```liquid
{% for product in order.products %}
  {{ product.sku }}           // Product SKU
  {{ product.title }}         // Product name
  {{ product.price_total }}   // Total price for this line item
  {{ product.quantity }}      // Quantity ordered
{% endfor %}
```

## 📧 Email Template Variables

Email templates use **square bracket syntax** instead of curly braces:

```liquid
[[orderid]]      // Order number
[[invoiceid]]    // Invoice number
[[shop_title]]   // Store name
[[firstname]]    // Customer first name
```

## 🔧 Variable Syntax

### Rain Template Engine (Web Pages)
- **Print variable**: `{{ variable }}`
- **Control flow**: `{% if condition %}...{% endif %}`
- **Loops**: `{% for item in collection %}...{% endfor %}`
- **Filters**: `{{ variable|filter }}` (e.g., `{{ product.title|escape }}`)

### Email Templates
- **Print variable**: `[[variable]]`

## ⚠️ Common Mistakes

### ❌ WRONG:
```javascript
var ORDER = '{{order.number}}';          // Missing "information"
var ORDER = '{{ order.id }}';            // Wrong property
var ORDER = '[[orderid]]';               // Email syntax in web template
```

### ✅ CORRECT:
```javascript
var ORDER = '{{ order.information.number }}';
```

## 🔍 Debugging Variables

To see available variables in a template:

```html
<script>
console.log('Order number:', '{{ order.information.number }}');
console.log('Shop:', '{{ shop.title }}');

// Check if variable is being replaced
var test = '{{ order.information.number }}';
console.log('Variable replaced?', test.indexOf('{{') === -1);
</script>
```

## 📍 Template Locations

Variables are available in different templates:

| Template | Location | Available Variables |
|----------|----------|---------------------|
| Thank You Page | After checkout completion | `order.information.*`, `order.products` |
| Product Page | Individual product view | `product.*`, `product.variants` |
| Cart Page | Shopping cart | `cart.products`, `cart.total` |
| Collection Page | Category/collection view | `collection.products` |

## 🔗 Related Documentation

- **Rain Syntax**: https://ecom-support.lightspeedhq.com/hc/en-us/articles/115000272453-3-e-Rain-syntax
- **Template Editor**: https://ecom-support.lightspeedhq.com/hc/en-us/articles/115000272373-2-c-Using-the-Template-Editor
- **Page Structure**: https://ecom-support.lightspeedhq.com/hc/en-us/articles/115000277574-3-a-Rain-page-structure

---

**Last Updated**: 29 October 2025
**Status**: ✅ Verified working with VikGinChoice and Retoertje implementations
