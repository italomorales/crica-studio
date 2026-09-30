import test from 'node:test';
import assert from 'node:assert/strict';
import { isContactLink, sendWhatsAppClick, WHATSAPP_CONVERSION } from '../src/app/services/whatsapp-tracking.ts';

const contact = 'https://wa.me/5511963136152?text=Nome%20e%20mensagem%20privados';
test('only a direct WhatsApp contact is eligible, not sharing or supplier URLs', () => {
    assert.equal(isContactLink(contact), true);
    for (const url of ['https://wa.me/?text=produto', 'https://wa.me.evil.test/5511963136152', 'https://shopee.com.br/item', 'http://wa.me/5511963136152', 'https://user@wa.me/5511963136152', 'invalid']) {
        assert.equal(isContactLink(url), false, url);
    }
});
test('routes one event to each destination without message, phone or query parameters', () => {
    const calls: unknown[][] = [];
    sendWhatsAppClick(contact, { source: 'product', productId: 'product-123', quantity: 20 },
        'https://www.cricastudio.com.br/loja/caneca?personalizacao=privada#form', (...args) => calls.push(args));
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], ['event', 'whatsapp_click', {
        send_to: 'G-6GMXMZH5KQ', contact_channel: 'whatsapp', contact_source: 'product',
        page_path: '/loja/caneca', page_location: 'https://www.cricastudio.com.br/loja/caneca',
        product_id: 'product-123', quantity: 20,
    }]);
    assert.deepEqual(calls[1], ['event', 'conversion', {
        send_to: WHATSAPP_CONVERSION, value: 0, currency: 'BRL',
        page_location: 'https://www.cricastudio.com.br/loja/caneca',
    }]);
    assert.doesNotMatch(JSON.stringify(calls), /5511963136152|privad|personalizacao|wa\.me/);
});
test('local previews and share links do not create conversions', () => {
    const fail = () => assert.fail('must not send');
    assert.equal(sendWhatsAppClick(contact, { source: 'floating' }, 'http://localhost:4173/loja', fail), false);
    assert.equal(sendWhatsAppClick('https://wa.me/?text=produto', { source: 'floating' }, 'https://www.cricastudio.com.br/loja', fail), false);
});
test('tracking errors do not propagate and each destination is independent', () => {
    let attempts = 0;
    assert.doesNotThrow(() => sendWhatsAppClick(contact, { source: 'footer' }, 'https://www.cricastudio.com.br/loja', () => {
        attempts++;
        throw new Error('blocked');
    }));
    assert.equal(attempts, 2);
});
