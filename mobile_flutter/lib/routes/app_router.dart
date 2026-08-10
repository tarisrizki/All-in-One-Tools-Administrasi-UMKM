import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/register_screen.dart';
import '../features/home/presentation/home_screen.dart';
import '../features/orders/presentation/order_screen.dart';
import '../features/outlet/presentation/outlet_screen.dart';
import '../features/payment/presentation/payment_screen.dart';
import '../features/pricing/presentation/pricing_screen.dart';
import '../features/printing/presentation/receipt_preview_screen.dart';
import '../features/products/presentation/product_form_screen.dart';
import '../features/products/presentation/product_list_screen.dart';
import '../features/promo/presentation/discount_screen.dart';
import '../features/promo/presentation/loyalty_screen.dart';
import '../features/reports/presentation/report_screen.dart';
import '../features/tables/presentation/table_screen.dart';
import '../shared/widgets/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(location: state.uri.toString(), child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/products', builder: (_, __) => const ProductListScreen()),
          GoRoute(path: '/products/form', builder: (_, __) => const ProductFormScreen()),
          GoRoute(path: '/orders', builder: (_, __) => const OrderScreen()),
          GoRoute(path: '/payment', builder: (_, __) => const PaymentScreen()),
          GoRoute(path: '/outlet', builder: (_, __) => const OutletScreen()),
          GoRoute(path: '/pricing', builder: (_, __) => const PricingScreen(productId: '')),
          GoRoute(path: '/pricing/:productId', builder: (_, s) => PricingScreen(productId: s.pathParameters['productId'] ?? '')),
          GoRoute(path: '/printing', builder: (_, __) => const ReceiptPreviewScreen()),
          GoRoute(path: '/promo/discount', builder: (_, __) => const DiscountScreen()),
          GoRoute(path: '/promo/loyalty', builder: (_, __) => const LoyaltyScreen()),
          GoRoute(path: '/reports', builder: (_, __) => const ReportScreen()),
          GoRoute(path: '/tables', builder: (_, __) => const TableScreen()),
        ],
      ),
      GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/auth/register', builder: (_, __) => const RegisterScreen()),
    ],
  );
});
