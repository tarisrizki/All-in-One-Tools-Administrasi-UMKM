import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:hive/hive.dart';
import 'package:dio/dio.dart';

import '../lib/shared/services/payment_service.dart';
import '../lib/shared/models/payment.dart';

class MockDio extends Mock implements Dio {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PaymentService - Offline Error Handling', () {
    late PaymentService paymentService;
    late MockDio mockDio;

    setUp(() async {
      Hive.init('test_hive');
      mockDio = MockDio();
      paymentService = PaymentService(mockDio);
    });

    tearDown(() async {
      await Hive.close();
    });

    test('createPayment returns successful result when network works', () async {
      when(
        () => mockDio.post(any(), data: any(named: 'data')),
      ).thenAnswer(
        (_) async => Response(
          data: {
            'id': 'pay-1',
            'orderId': 'ord-123',
            'amount': 100000,
            'method': 'cash',
            'status': 'paid',
          },
          requestOptions: RequestOptions(path: '/payments'),
        ),
      );

      final payment = Payment(
        id: '',
        orderId: 'ord-123',
        amount: 100000,
        method: PaymentMethod.cash,
        status: PaymentStatus.pending,
      );

      final result = await paymentService.createPayment(payment);
      expect(result.status, equals(PaymentStatus.paid));
    });

    test('createQris returns mock QR when offline', () async {
      when(
        () => mockDio.post(any(), data: any(named: 'data')),
      ).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: '/payments/qris'),
          type: DioExceptionType.connectionError,
        ),
      );

      final qr = await paymentService.createQris(
        orderId: 'ord-123',
        amount: 50000,
      );

      expect(qr.isNotEmpty, true); // Returns mock or fallback
    });
  });
}
