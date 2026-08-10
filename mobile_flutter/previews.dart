import 'package:flutter/material.dart';
import 'package:flutter/widget_previews.dart';
import 'package:beres_pos/core/theme/app_theme.dart';

@Preview(name: 'FilledButton — primary', group: 'Buttons')
Widget previewFilledButton() {
  return MaterialApp(theme: AppTheme.light(), home: Scaffold(body: Center(child: FilledButton(onPressed: () {}, child: const Text('Checkout')))));
}

@Preview(name: 'Card r12 outlineVariant', group: 'Cards')
Widget previewCard() {
  return MaterialApp(theme: AppTheme.light(), home: Scaffold(body: Center(child: Card(child: Padding(padding: const EdgeInsets.all(16), child: const Text('ProductCard'))))));
}

@Preview(name: 'TextField r10 pad 14', group: 'Inputs')
Widget previewTextField() {
  return MaterialApp(theme: AppTheme.light(), home: Scaffold(body: Padding(padding: const EdgeInsets.all(16), child: TextField(decoration: InputDecoration(labelText: 'Nama produk', border: OutlineInputBorder(borderRadius: BorderRadius.circular(10))), controller: TextEditingController(text: 'Kopi')))));
}

@Preview(name: 'OrderTile — filled', group: 'POS')
Widget previewOrderTile() {
  return MaterialApp(theme: AppTheme.light(), home: Scaffold(body: ListTile(leading: const Icon(Icons.receipt), title: const Text('Pesanan #001'), subtitle: const Text('2 item • Rp 32.000'), trailing: FilledButton(onPressed: () {}, child: const Text('Bayar')))));
}
