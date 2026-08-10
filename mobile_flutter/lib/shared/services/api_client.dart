import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/auth_session.dart';
import 'auth_storage.dart';

/// Base URL API prod Beres (Hono + Cloudflare Workers).
const String kApiBaseUrl = 'https://api.beres.lambada.my.id';

/// API client bersama — WAJIB dipakai semua feature (jangan buat client sendiri).
class ApiClient {
  ApiClient._(this._dio);

  final Dio _dio;

  static ApiClient? _instance;

  /// Inisialisasi sekali di main().
  static Future<ApiClient> init() async {
    if (_instance != null) return _instance!;
    final dio = Dio(
      BaseOptions(
        baseUrl: kApiBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    // Interceptor: sisipkan token dari session aktif.
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final session = await AuthStorage.loadSession();
          if (session != null && session.token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer ${session.token}';
          }
          handler.next(options);
        },
      ),
    );

    _instance = ApiClient._(dio);
    return _instance!;
  }

  static ApiClient get instance {
    final i = _instance;
    if (i == null) {
      throw StateError('ApiClient belum di-init. Panggil ApiClient.init() di main().');
    }
    return i;
  }

  Dio get dio => _dio;

  /// POST /auth/register — 2-step: {phone, password} lalu {businessName}.
  Future<AuthSession> register({
    required String phone,
    required String password,
    required String businessName,
  }) async {
    final res = await _dio.post(
      '/auth/register',
      data: {'phone': phone, 'password': password, 'businessName': businessName},
    );
    final body = res.data as Map<String, dynamic>;
    if (res.statusCode != 201 || body['success'] != true) {
      throw ApiException(_messageFrom(body));
    }
    return AuthSession.fromJson(body['data'] as Map<String, dynamic>);
  }

  /// POST /auth/login — {phone, password}.
  Future<AuthSession> login({required String phone, required String password}) async {
    final res = await _dio.post(
      '/auth/login',
      data: {'phone': phone, 'password': password},
    );
    final body = res.data as Map<String, dynamic>;
    if (res.statusCode != 200 || body['success'] != true) {
      throw ApiException(_messageFrom(body));
    }
    return AuthSession.fromJson(body['data'] as Map<String, dynamic>);
  }

  /// GET /subscriptions/me — status langganan.
  Future<Map<String, dynamic>> getSubscription() async {
    final res = await _dio.get('/subscriptions/me');
    return res.data as Map<String, dynamic>;
  }

  String _messageFrom(Map<String, dynamic> body) {
    final err = body['error'];
    if (err is Map && err['message'] != null) return err['message'] as String;
    if (err is String) return err;
    return 'Terjadi kesalahan, coba lagi.';
  }

  /// Constructor for testing with custom Dio instance.
  ApiClient.fromDio(Dio dio) : this._(dio);
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}

/// Provider Riverpod global — shared untuk semua feature.
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient.instance);

final authSessionProvider = StateProvider<AuthSession?>((ref) => null);
