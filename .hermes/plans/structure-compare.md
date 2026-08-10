# Perbandingan Struktur vs Referensi Industri

| Aspek | Beres (`lib/{core,features,shared,routes,main}` M3 seed teal 54 dart) | flutter_pos (`lib/{app,core,data,domain,presentation}` Clean 5-layer) | flutter-pos-system (inventori/printer/analytics fitur lengkap) |
|-------|--------|--------|--------|
| Sejalan | feature-first + screen per feature + riverpod Notifier/State + data flow Notifier→Repo→Datasource rule | sama | sama (feature grouping, screen per domain) |
| Beda | Slim DI (Riverpod provider) vs `app/di` + domain/ usecase (`GetUserUsecase`, `NoParam`) | Tanpa `domain/entities` + `data/models` terpisah (economy) | Lebih ke product-centric POS vs Beres yang outlet/table/loyalty heavy |
| Gap sane | Beres tanpa `domain/usecases` layer (YAGNI until complexity) — OK; tidak perlu `domain/entities` pecah per feature sekarang | — | — |
| Rekomendasi | Tetap Beres ringkas (feature-first) — adopt `usecase` hanya bila Notifier→Repo call butuh orkestrasi multi-repo | — | — |

## Method
- `flutter_pos` 5-layer `app/di` + `core` + `data` + `domain` + `presentation` (usecase `USeCase<Result,Params>` pattern `user_usecases.dart` demo) — via `skills/flutter-pos-ref/CLAUDE.md` (Clean Architecture 5 layers).
- `flutter-pos-system` fitur lengkap POS (inventori, printer, analytics) — via `flutter-pos-system-ref/lib` top-level.
- Verdict: Beres lean cocok window POS menengah; tidak perlu heavy Clean Architecture sampai scale 100+ screens.