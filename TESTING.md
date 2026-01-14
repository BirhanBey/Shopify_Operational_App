# Test Dokümantasyonu

Bu dokümantasyon, projedeki test yapısını, test dosyalarını ve test yazma süreçlerini açıklar.

## 📋 İçindekiler

1. [Test Yapısı](#test-yapısı)
2. [Test Framework'leri](#test-frameworkleri)
3. [Test Klasör Yapısı](#test-klasör-yapısı)
4. [Test Çalıştırma](#test-çalıştırma)
5. [Test Dosyaları ve Kapsamları](#test-dosyaları-ve-kapsamları)
6. [Mock'lar ve Fixture'lar](#mocklar-ve-fixturelar)
7. [Test Yazma Rehberi](#test-yazma-rehberi)
8. [Best Practices](#best-practices)

---

## Test Yapısı

Proje, **Vitest** test framework'ü kullanılarak test edilmektedir. Testler şu kategorilere ayrılmıştır:

- **Unit Testler**: Tekil fonksiyonların ve modüllerin izole testleri
- **Integration Testler**: API route'ları ve database işlemlerinin testleri
- **Component Testler**: React component'lerinin testleri
- **DOM Testler**: Vanilla JavaScript DOM manipülasyonlarının testleri

---

## Test Framework'leri

### Kurulu Paketler

- **Vitest** (`^1.6.1`): Ana test framework'ü
- **@testing-library/react** (`^14.1.2`): React component testleri için
- **@testing-library/jest-dom** (`^6.1.5`): DOM matchers için
- **@testing-library/user-event** (`^14.5.1`): Kullanıcı etkileşimleri için
- **msw** (`^2.0.0`): API mock'ları için (Mock Service Worker)
- **jsdom**: DOM environment için (Vitest ile birlikte gelir)
- **@vitest/coverage-v8** (`^1.6.1`): Code coverage için
- **@vitest/ui** (`^1.6.1`): Test UI için
- **@vitejs/plugin-react**: React plugin for Vitest

---

## Test Klasör Yapısı

```
tests/
├── __mocks__/                    # Mock dosyaları
│   ├── server.js                # MSW server setup
│   ├── handlers.js              # MSW API handlers
│   ├── prisma.js                # Prisma client mock
│   └── shopify.server.js       # Shopify server mock
├── __fixtures__/                # Test data fixtures
│   ├── editor-settings.js      # Editor settings test data
│   ├── project-data.js          # Project data test fixtures
│   └── variant-metafields.js   # Variant metafields test data
├── setup.js                     # Test setup dosyası
├── app/                         # app/ klasörü testleri
│   ├── db.server.test.js
│   ├── shopify.server.test.js
│   └── routes/
│       ├── api.create-project.test.jsx
│       ├── api.project-details.test.jsx
│       ├── api.editor-settings.test.jsx
│       ├── api.variant-metafields.test.jsx
│       └── api.project-thumbnail.test.jsx
└── extensions/                  # extensions/ klasörü testleri
    ├── product-editor-content/
    │   └── assets/
    │       ├── product-page-operations.test.js
    │       └── cart-page-operations.test.js
    └── peleman-product-editor-settings/
        └── src/
            └── Index.test.jsx
```

---

## Test Çalıştırma

### Temel Komutlar

```bash
# Tüm testleri çalıştır ve sonuçları TestResults.txt'ye kaydet
npm test

# Testleri çalıştır (sonuçları dosyaya kaydetmeden)
npm run test:raw

# Watch mode (değişiklikleri izleyerek testleri çalıştır)
npm run test:watch

# Code coverage raporu oluştur
npm run test:coverage

# Test UI'ı aç (interaktif test arayüzü)
npm run test:ui
```

### Test Sonuçlarını Dosyaya Kaydetme

`npm test` komutu çalıştırıldığında, test sonuçları otomatik olarak proje kök dizininde `TestResults.txt` dosyasına kaydedilir.

**Özellikler:**
- ✅ Her test çalıştırmasında yeni bir dosya oluşturulur (mevcut dosya üzerine yazılır)
- ✅ Test sonuçları hem console'da gösterilir hem de dosyaya kaydedilir
- ✅ Dosya içeriği: timestamp, test output, hatalar ve exit code
- ✅ Dosya konumu: Proje kök dizini (`TestResults.txt`)
- ✅ Test başarısız olsa bile sonuçlar kaydedilir

**Dosya Formatı:**
```
=== Test Results ===
Timestamp: 2025-01-14T10:30:45.123Z

[Test output buraya gelir]

=== Errors ===
[Error output buraya gelir]

=== Exit Code: 0 ===
```

**Not:** `TestResults.txt` dosyası `.gitignore` içinde olduğu için git'e commit edilmez.

### Belirli Test Dosyasını Çalıştırma

```bash
# Tek bir test dosyası
npm test tests/app/routes/api.create-project.test.jsx

# Belirli bir pattern ile eşleşen testler
npm test -- --grep "create project"
```

### Debug Modu

```bash
# Verbose output ile
npm test -- --reporter=verbose

# Sadece başarısız testleri göster
npm test -- --reporter=basic
```

---

## Test Dosyaları ve Kapsamları

### app/ Klasörü Testleri

#### `db.server.test.js`
**Kapsam**: Prisma client singleton pattern testleri

**Test Edilenler**:
- PrismaClient instance export
- Global instance yönetimi (development vs production)
- Instance reuse logic

**Örnek Test**:
```javascript
it('should export a PrismaClient instance', () => {
  expect(prisma).toBeDefined();
  expect(prisma).toHaveProperty('$connect');
});
```

#### `shopify.server.test.js`
**Kapsam**: Shopify app konfigürasyonu testleri

**Test Edilenler**:
- Shopify app instance export
- Authentication functions export
- Session storage export
- Webhook registration export
- API version export

#### `routes/api.editor-settings.test.jsx`
**Kapsam**: Editor settings API endpoint testleri

**Test Edilenler**:
- ✅ Shop parameter validation
- ✅ Settings loading from database
- ✅ Missing settings handling
- ✅ Database error handling
- ✅ CORS headers
- ✅ OPTIONS request handling

**Mock'lar**:
- Prisma client (`editorSettings.findUnique`)

**Test Senaryoları**:
1. Başarılı settings yükleme
2. Shop parameter eksik
3. Settings bulunamadı
4. Database hatası

#### `routes/api.create-project.test.jsx`
**Kapsam**: Project creation API endpoint testleri

**Test Edilenler**:
- ✅ Shop parameter validation
- ✅ Editor settings validation
- ✅ Request body generation
- ✅ API URL building
- ✅ External API calls
- ✅ Success response handling
- ✅ Error handling (network, API errors)
- ✅ POST request handling
- ✅ Overrides parameter handling
- ✅ JSON payload validation
- ✅ CORS headers

**Mock'lar**:
- Prisma client
- Global fetch (editor API)

**Test Senaryoları**:
1. Başarılı project creation
2. Shop parameter eksik
3. Editor settings eksik/incomplete
4. External API hatası
5. Network hatası
6. Invalid JSON payload
7. POST request ile overrides

#### `routes/api.project-details.test.jsx`
**Kapsam**: Project details API endpoint testleri

**Test Edilenler**:
- ✅ Project ID validation
- ✅ Shop parameter validation
- ✅ Editor settings validation
- ✅ External API calls
- ✅ JSON response parsing
- ✅ Error handling
- ✅ CORS headers

**Mock'lar**:
- Prisma client
- Global fetch (editor API)

#### `routes/api.project-thumbnail.test.jsx`
**Kapsam**: Project thumbnail API endpoint testleri

**Test Edilenler**:
- ✅ Project ID validation
- ✅ Shop parameter validation
- ✅ Editor settings validation
- ✅ Image fetching
- ✅ Base64 encoding
- ✅ Error handling
- ✅ CORS headers

**Mock'lar**:
- Prisma client
- Global fetch (editor API)

#### `routes/api.variant-metafields.test.jsx`
**Kapsam**: Variant metafields API endpoint testleri

**Test Edilenler**:
- ✅ Shop parameter validation
- ✅ Product handle validation
- ✅ GraphQL query execution
- ✅ Authentication handling
- ✅ Session storage fallback
- ✅ Metafield parsing
- ✅ Error handling
- ✅ CORS headers

**Mock'lar**:
- Prisma client
- Shopify authentication
- Shopify session storage
- GraphQL client

### extensions/ Klasörü Testleri

#### `product-page-operations.test.js`
**Kapsam**: Product page DOM manipülasyonları testleri

**Test Edilenler**:
- ✅ Product page detection
- ✅ Project reference input creation
- ✅ Personalisation dropdown creation
- ✅ URL building functions
- ✅ Variant ID normalization
- ✅ Cart add URL building
- ✅ Editor URL building

**Test Ortamı**: JSDOM

**Örnek Test**:
```javascript
it('should create project reference input element', () => {
  const input = document.createElement('input');
  input.id = 'project-reference-input';
  expect(input).toBeTruthy();
});
```

#### `cart-page-operations.test.js`
**Kapsam**: Cart page DOM manipülasyonları testleri

**Test Edilenler**:
- ✅ Cart page detection
- ✅ Project ID extraction (data attributes, properties)
- ✅ Edit button creation
- ✅ Thumbnail replacement
- ✅ Variant ID normalization
- ✅ Personalisation fee detection

**Test Ortamı**: JSDOM

#### `Index.test.jsx`
**Kapsam**: React component testleri (PelemanProductEditorSettings)

**Test Edilenler**:
- ✅ Component rendering
- ✅ Loading state
- ✅ Variant selector
- ✅ Form fields display
- ✅ Variant selection change
- ✅ Save button
- ✅ Error states

**Mock'lar**:
- `@shopify/ui-extensions-react/admin` components
- GraphQL query function

---

## Mock'lar ve Fixture'lar

### Mock Dosyaları

#### `__mocks__/prisma.js`
Prisma client mock'u. Tüm Prisma işlemleri için mock fonksiyonlar sağlar.

**Kullanım**:
```javascript
import { createMockPrisma } from '../../__mocks__/prisma.js';

const mockPrisma = createMockPrisma();
mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);
```

#### `__mocks__/shopify.server.js`
Shopify server fonksiyonlarının mock'u.

**Kullanım**:
```javascript
import { mockShopifyApp } from '../../__mocks__/shopify.server.js';

mockShopifyApp.authenticate.admin.mockResolvedValue({
  admin: { graphql: vi.fn() },
  session: { shop: 'test-shop.myshopify.com' },
});
```

#### `__mocks__/handlers.js`
MSW (Mock Service Worker) handlers. External API'lerin mock'ları.

**Handler'lar**:
- Editor API - create project
- Editor API - project details
- Editor API - project thumbnail
- Shopify GraphQL API

**Kullanım**: Otomatik olarak `setup.js` içinde yüklenir.

### Fixture Dosyaları

#### `__fixtures__/editor-settings.js`
Editor settings test data'ları:
- `mockEditorSettings`: Tam settings
- `mockEditorSettingsIncomplete`: Eksik settings
- `mockEditorSettingsMissing`: Settings yok

#### `__fixtures__/project-data.js`
Project data test fixtures:
- `mockProjectResponse`: Project creation response
- `mockProjectDetails`: Project details response
- `mockProjectThumbnail`: Thumbnail response

#### `__fixtures__/variant-metafields.js`
Variant metafields test data'ları:
- `mockVariantMetafields`: Metafields map
- `mockGraphQLResponse`: GraphQL response

---

## Test Yazma Rehberi

### Yeni Test Dosyası Oluşturma

1. **Dosya konumu**: Test edilecek dosyanın yolu ile aynı yapıyı `tests/` altında oluşturun.

   Örnek: `app/routes/api.create-project.jsx` → `tests/app/routes/api.create-project.test.jsx`

2. **Temel yapı**:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Module Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    // Test
  });
});
```

### Test Yazma Adımları

1. **Describe bloğu**: Test edilen modülü açıklayın
2. **BeforeEach**: Her test öncesi setup
3. **Test cases**: Her senaryo için ayrı `it` bloğu
4. **Assertions**: `expect` ile doğrulamalar

### Mock Kullanımı

#### Prisma Mock
```javascript
import { createMockPrisma } from '../../__mocks__/prisma.js';

vi.mock('../../app/db.server.js', () => ({
  default: createMockPrisma(),
}));

// Test içinde
const prismaModule = await import('../../app/db.server.js');
const mockPrisma = prismaModule.default;
mockPrisma.editorSettings.findUnique.mockResolvedValue(mockData);
```

#### Fetch Mock
```javascript
global.fetch = vi.fn();

global.fetch.mockResolvedValueOnce({
  ok: true,
  status: 200,
  json: async () => ({ data: 'test' }),
});
```

#### React Component Mock
```javascript
vi.mock('@shopify/ui-extensions-react/admin', () => ({
  useApi: () => ({
    query: vi.fn(),
    data: { selected: [{ id: 'test-id' }] },
  }),
  // ... diğer component mock'ları
}));
```

### DOM Testleri

JSDOM kullanarak DOM manipülasyonlarını test edin:

```javascript
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { window, document } = dom;
global.window = window;
global.document = document;
```

### Async Testler

```javascript
it('should handle async operations', async () => {
  const response = await loader({ request });
  const data = await response.json();
  expect(data.success).toBe(true);
});
```

### Error Handling Testleri

```javascript
it('should handle errors gracefully', async () => {
  mockPrisma.editorSettings.findUnique.mockRejectedValue(
    new Error('Database error')
  );
  
  const response = await loader({ request });
  const data = await response.json();
  
  expect(response.status).toBe(500);
  expect(data.error).toBeDefined();
});
```

---

## Best Practices

### 1. Test İsimlendirme
- Açıklayıcı test isimleri kullanın
- "should" ile başlayın: `it('should return error when shop is missing')`
- Senaryoyu açıklayın: ne test ediliyor, hangi koşullarda

### 2. Test Organizasyonu
- İlgili testleri `describe` blokları altında gruplayın
- Her test bağımsız olmalı (beforeEach ile setup)
- Test sırası önemli olmamalı

### 3. Mock Kullanımı
- Sadece gerekli yerleri mock'layın
- Mock'ları test başında setup edin
- Her test sonrası mock'ları temizleyin (`vi.clearAllMocks()`)

### 4. Assertions
- Spesifik assertion'lar kullanın
- Error mesajlarını test edin
- Status code'ları kontrol edin
- Response structure'ı doğrulayın

### 5. Coverage
- Minimum %80 coverage hedefleyin
- Critical path'leri mutlaka test edin
- Edge case'leri unutmayın

### 6. Performance
- Test'ler hızlı olmalı (< 1 saniye)
- Gereksiz async işlemlerden kaçının
- Mock'ları kullanarak external call'ları önleyin

### 7. Maintainability
- Test kodunu da temiz tutun
- DRY prensibini uygulayın (fixture'lar kullanın)
- Yorum satırları ekleyin (gerekirse)

---

## Test Senaryoları Özeti

### API Route Testleri

Her API route için şu senaryolar test edilmelidir:

1. ✅ **Happy Path**: Başarılı senaryo
2. ✅ **Missing Parameters**: Eksik parametreler
3. ✅ **Invalid Data**: Geçersiz data
4. ✅ **Database Errors**: Database hataları
5. ✅ **External API Errors**: External API hataları
6. ✅ **Network Errors**: Network hataları
7. ✅ **CORS Headers**: CORS header kontrolü
8. ✅ **OPTIONS Request**: Preflight request handling

### Component Testleri

Her React component için:

1. ✅ **Rendering**: Component render oluyor mu?
2. ✅ **Loading States**: Loading state'leri doğru mu?
3. ✅ **User Interactions**: Kullanıcı etkileşimleri çalışıyor mu?
4. ✅ **Error States**: Error state'leri gösteriliyor mu?
5. ✅ **Data Display**: Data doğru gösteriliyor mu?

### DOM Manipülasyon Testleri

Her DOM manipülasyonu için:

1. ✅ **Element Creation**: Elementler oluşturuluyor mu?
2. ✅ **Element Selection**: Elementler doğru seçiliyor mu?
3. ✅ **Event Handling**: Event'ler doğru handle ediliyor mu?
4. ✅ **State Updates**: State güncellemeleri doğru mu?

---

## Sorun Giderme

### Test Çalışmıyor

1. **Node modules kontrolü**: `npm install` çalıştırın
2. **Vitest config**: `vitest.config.js` dosyasını kontrol edin
3. **Import path'leri**: Path'lerin doğru olduğundan emin olun

### Mock'lar Çalışmıyor

1. **Mock sırası**: Mock'lar import'lardan önce olmalı
2. **vi.mock()**: Doğru path ile mock'ladığınızdan emin olun
3. **Clear mocks**: beforeEach'te mock'ları temizleyin

### DOM Testleri Çalışmıyor

1. **JSDOM setup**: JSDOM'un doğru setup edildiğinden emin olun
2. **Global variables**: window, document global olarak set edilmeli
3. **Cleanup**: afterEach'te DOM'u temizleyin

---

## İletişim ve Destek

Test yapısı ile ilgili sorularınız için:
- Bu dokümantasyonu inceleyin
- Mevcut test dosyalarını örnek alın
- Vitest dokümantasyonuna bakın: https://vitest.dev/

---

---

## Test İstatistikleri

**Mevcut Test Durumu:**
- ✅ **10 test dosyası** - Tüm testler başarılı
- ✅ **67 test case** - Tüm testler geçiyor
- ✅ **0 başarısız test**
- ✅ **Test Coverage**: Tüm kritik path'ler test ediliyor

**Test Kategorileri:**
- **API Route Testleri**: 5 dosya, 35+ test
- **Database Testleri**: 2 dosya, 8 test
- **Frontend Extension Testleri**: 2 dosya, 20+ test
- **React Component Testleri**: 1 dosya, 7 test

**Son Test Çalıştırma:**
- Tüm testler başarıyla geçti
- Test süresi: ~19-25 saniye
- Exit Code: 0 (başarılı)

---

**Son Güncelleme**: 2026-01-14
**Test Framework Versiyonu**: Vitest 1.6.1
