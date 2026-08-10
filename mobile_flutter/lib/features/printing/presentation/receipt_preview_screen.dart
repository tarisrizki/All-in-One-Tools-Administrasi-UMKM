import 'package:flutter/material.dart';
import 'package:beres_pos/core/theme/app_colors.dart';
import 'package:flutter/services.dart';

import '../../../shared/models/order.dart';
import '../../../shared/models/order_item.dart';
import '../../../shared/models/receipt_template.dart';
import '../../../shared/services/print_service.dart';

/// Preview struk + kitchen ticket + template editor.
/// Route: /printing/preview  (daftar via go_router)
///
/// Jika order tidak di-pass, tampilkan contoh order demo.
class ReceiptPreviewScreen extends StatefulWidget {
  const ReceiptPreviewScreen({super.key, this.order, this.template});

  final Order? order;
  final ReceiptTemplate? template;

  @override
  State<ReceiptPreviewScreen> createState() => _ReceiptPreviewScreenState();
}

class _ReceiptPreviewScreenState extends State<ReceiptPreviewScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  late ReceiptTemplate _tmpl;
  late Order _order;
  late PrintService _svc;
  String _status = '';

  // Editor controllers
  late TextEditingController _headerCtrl;
  late TextEditingController _footerCtrl;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _tmpl = widget.template ?? ReceiptTemplate.defaultTemplate;
    _order = widget.order ?? _demoOrder();
    _svc = PrintService();
    _headerCtrl = TextEditingController(text: _tmpl.header);
    _footerCtrl = TextEditingController(text: _tmpl.footer);
  }

  @override
  void dispose() {
    _tab.dispose();
    _headerCtrl.dispose();
    _footerCtrl.dispose();
    super.dispose();
  }

  Order _demoOrder() => Order(
        id: 'ORD-001',
        outletId: 'outlet-demo',
        type: OrderType.dineIn,
        status: OrderStatus.pending,
        queueNumber: 12,
        tableId: 'A3',
        createdAt: DateTime.now(),
        items: const [
          OrderItem(productId: 'p1', name: 'Nasi Gudeg', qty: 2, price: 25000),
          OrderItem(productId: 'p2', name: 'Es Teh', qty: 2, price: 5000),
          OrderItem(productId: 'p3', name: 'Kerupuk', qty: 1, price: 2000),
        ],
        serviceCharge: 5000,
      );

  void _applyEditor() {
    setState(() {
      _tmpl = _tmpl.copyWith(header: _headerCtrl.text, footer: _footerCtrl.text);
    });
  }

  Future<void> _doPrintReceipt() async {
    final r = await _svc.printReceipt(_order, _tmpl);
    if (!mounted) return;
    setState(() => _status = r.message);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r.message)));
  }

  Future<void> _doPrintKitchen() async {
    final r = await _svc.printKitchenTicket(_order);
    if (!mounted) return;
    setState(() => _status = r.message);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r.message)));
  }

  Future<void> _saveTemplate() async {
    _applyEditor();
    await _svc.saveTemplate(_tmpl);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Template disimpan')));
  }

  @override
  Widget build(BuildContext context) {
    final receiptText = _svc.receiptPreviewText(_order, _tmpl);
    final kitchenText = _svc.kitchenPreviewText(_order);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Preview Struk'),
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'Struk'),
            Tab(text: 'Dapur'),
            Tab(text: 'Editor'),
          ],
        ),
      ),
      body: Column(
        children: [
          if (_status.isNotEmpty)
            Container(
              width: double.infinity,
              color: AppColors.warningBg,
              padding: const EdgeInsets.all(8),
              child: Text(_status, style: const TextStyle(fontSize: 12)),
            ),
          Expanded(
            child: TabBarView(
              controller: _tab,
              children: [
                _PaperPreview(text: receiptText, onPrint: _doPrintReceipt, label: 'Cetak Struk'),
                _PaperPreview(text: kitchenText, onPrint: _doPrintKitchen, label: 'Cetak Kitchen'),
                _TemplateEditor(
                  tmpl: _tmpl,
                  headerCtrl: _headerCtrl,
                  footerCtrl: _footerCtrl,
                  onChanged: (t) => setState(() => _tmpl = t),
                  onApply: _applyEditor,
                  onSave: _saveTemplate,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PaperPreview extends StatelessWidget {
  const _PaperPreview({required this.text, required this.onPrint, required this.label});
  final String text;
  final VoidCallback onPrint;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Container(
                width: 320,
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: AppColors.surfaceMuted),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2))],
                ),
                padding: const EdgeInsets.all(16),
                child: SelectableText(
                  text,
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: Colors.black, height: 1.4),
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Clipboard.setData(ClipboardData(text: text)),
                  icon: const Icon(Icons.copy, size: 18),
                  label: const Text('Salin'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: onPrint,
                  icon: const Icon(Icons.print, size: 18),
                  label: Text(label),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TemplateEditor extends StatelessWidget {
  const _TemplateEditor({
    required this.tmpl,
    required this.headerCtrl,
    required this.footerCtrl,
    required this.onChanged,
    required this.onApply,
    required this.onSave,
  });

  final ReceiptTemplate tmpl;
  final TextEditingController headerCtrl;
  final TextEditingController footerCtrl;
  final ValueChanged<ReceiptTemplate> onChanged;
  final VoidCallback onApply;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: headerCtrl,
          decoration: const InputDecoration(labelText: 'Header', border: OutlineInputBorder()),
          onChanged: (_) => onApply(),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: footerCtrl,
          decoration: const InputDecoration(labelText: 'Footer', border: OutlineInputBorder()),
          onChanged: (_) => onApply(),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<ReceiptItemLayout>(
          initialValue: tmpl.itemLayout,
          decoration: const InputDecoration(labelText: 'Layout Item', border: OutlineInputBorder()),
          items: ReceiptItemLayout.values.map((e) => DropdownMenuItem(value: e, child: Text(e.label))).toList(),
          onChanged: (v) {
            if (v != null) onChanged(tmpl.copyWith(itemLayout: v));
          },
        ),
        const SizedBox(height: 12),
        SwitchListTile(
          title: const Text('Tampilkan Pajak/Service'),
          value: tmpl.showTax,
          onChanged: (v) => onChanged(tmpl.copyWith(showTax: v)),
        ),
        SwitchListTile(
          title: const Text('Tampilkan Nomor Antrian'),
          value: tmpl.showQueue,
          onChanged: (v) => onChanged(tmpl.copyWith(showQueue: v)),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: onSave,
          icon: const Icon(Icons.save),
          label: const Text('Simpan Template'),
        ),
        const SizedBox(height: 8),
        const Text(
          'Windows: cetak via channel windows/raw_print (fallback bluetooth_print).\nMobile: bluetooth_print.',
          style: TextStyle(fontSize: 11, color: Colors.grey),
        ),
      ],
    );
  }
}
