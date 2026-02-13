
export function generateSmsLink(phone: string, message: string): string {
    // Basic encoding
    const body = encodeURIComponent(message);
    const cleanPhone = phone.replace(/[^\d+]/g, "");

    // iOS and most Androids support sms:number&body=message or sms:number?body=message
    // The standard is slightly vague, but ?body= works on most modern devices.
    // Specifying the number directly: sms:+1555000000?body=...

    return `sms:${cleanPhone}?body=${body}`;
}
