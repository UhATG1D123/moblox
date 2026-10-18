import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';

const REPORTS_EMAIL = 'latpalex@gmail.com';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export async function POST(request) {
  const sb = serverClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please log in to submit a report.' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid report request.' }, { status: 400 });
  }

  const type = body?.type;
  const targetId = Number(body?.targetId);
  const reason = String(body?.reason ?? '').trim().slice(0, 500);
  if (!['user', 'item'].includes(type) || !Number.isSafeInteger(targetId) || targetId < 1 || reason.length < 3) {
    return NextResponse.json({ error: 'Choose a valid report target and provide a reason.' }, { status: 400 });
  }

  const { data: reporter, error: reporterError } = await sb
    .from('profiles')
    .select('id,username')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (reporterError || !reporter) return NextResponse.json({ error: 'Could not verify your Moblox account.' }, { status: 400 });

  let targetLabel = '';
  let targetUsername = '';
  let reportError;

  if (type === 'user') {
    if (targetId === reporter.id) return NextResponse.json({ error: 'You cannot report yourself.' }, { status: 400 });
    const { data: target, error: targetError } = await sb.rpc('get_public_profile', { p_id: targetId });
    if (targetError || !target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    targetUsername = target.username;
    targetLabel = `User @${target.username} (ID ${target.id})`;
    ({ error: reportError } = await sb.rpc('report_user', { p_target: targetId, p_reason: reason }));
  } else {
    const { data: item, error: itemError } = await sb
      .from('items')
      .select('id,name,creator_id')
      .eq('id', targetId)
      .maybeSingle();
    if (itemError || !item) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    targetLabel = `Item "${item.name}" (ID ${item.id})`;
    if (item.creator_id) {
      const { data: creator } = await sb.rpc('get_public_profile', { p_id: item.creator_id });
      targetUsername = creator?.username || '';
    }
    ({ error: reportError } = await sb.rpc('report_item', { p_item: targetId, p_reason: reason }));
  }

  if (reportError) return NextResponse.json({ error: reportError.message }, { status: 400 });

  const submittedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'UTC',
  });
  const subject = `[Moblox Report] ${type === 'user' ? 'User report' : 'Item report'} — ${type === 'user' ? '@' + targetUsername : targetLabel}`;
  const textBody = [
    'MOBLOX — COMMUNITY REPORT',
    '',
    `Report type: ${type === 'user' ? 'User' : 'Catalog item'}`,
    `Reported target: ${targetLabel}`,
    `Reported username: ${targetUsername ? '@' + targetUsername : 'Not applicable'}`,
    `Submitted by: @${reporter.username} (User ID ${reporter.id})`,
    `Submitted at: ${submittedAt}`,
    '',
    'REPORT REASON',
    reason,
    '',
    'Review this report in the Moblox Admin dashboard: https://moblox.xyz/admin',
  ].join('\n');

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MOBLOX_REPORTS_FROM || 'Moblox Reports <onboarding@resend.dev>';
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      emailSent: false,
      message: 'Your report was saved, but email notifications are not configured yet.',
    });
  }

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [REPORTS_EMAIL],
        replyTo: [REPORTS_EMAIL],
        subject,
        text: textBody,
        html: `
          <div style="margin:0;background:#f3f4f6;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#202124">
            <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #dadce0;border-radius:8px;overflow:hidden">
              <div style="background:#232527;color:#fff;padding:22px 28px">
                <div style="font-size:12px;letter-spacing:2px;color:#c6c8ca">MOBLOX SAFETY</div>
                <h1 style="font-size:23px;margin:8px 0 0">Community Report</h1>
                <p style="font-size:14px;color:#d9dadd;margin:8px 0 0">A new report has been submitted on Moblox.</p>
              </div>
              <div style="padding:26px 28px">
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr><td style="padding:11px 0;color:#6b7280;width:150px;border-bottom:1px solid #eee">Report type</td><td style="padding:11px 0;border-bottom:1px solid #eee;font-weight:600">${escapeHtml(type === 'user' ? 'User' : 'Catalog item')}</td></tr>
                  <tr><td style="padding:11px 0;color:#6b7280;border-bottom:1px solid #eee">Reported target</td><td style="padding:11px 0;border-bottom:1px solid #eee">${escapeHtml(targetLabel)}</td></tr>
                  <tr><td style="padding:11px 0;color:#6b7280;border-bottom:1px solid #eee">Reported username</td><td style="padding:11px 0;border-bottom:1px solid #eee">${escapeHtml(targetUsername ? '@' + targetUsername : 'Not applicable')}</td></tr>
                  <tr><td style="padding:11px 0;color:#6b7280;border-bottom:1px solid #eee">Reported by</td><td style="padding:11px 0;border-bottom:1px solid #eee">@${escapeHtml(reporter.username)} (User ID ${reporter.id})</td></tr>
                  <tr><td style="padding:11px 0;color:#6b7280">Submitted at</td><td style="padding:11px 0">${escapeHtml(submittedAt)}</td></tr>
                </table>
                <h2 style="font-size:15px;margin:26px 0 10px">Report reason</h2>
                <div style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f7f7f8;border:1px solid #e5e7eb;border-radius:6px;padding:16px;font-size:14px;line-height:1.6">${escapeHtml(reason)}</div>
                <p style="margin:26px 0 0"><a href="https://moblox.xyz/admin" style="display:inline-block;background:#335fff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:5px;font-weight:600">Review report in Admin</a></p>
              </div>
              <div style="padding:16px 28px;background:#f8f9fa;border-top:1px solid #e5e7eb;color:#777;font-size:12px">Automated notification from Moblox. Replies go to the Moblox moderation inbox.</div>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      return NextResponse.json({
        ok: true,
        emailSent: false,
        message: 'Your report was saved, but the email notification could not be sent. It is still available in the Admin dashboard.',
      });
    }
  } catch {
    return NextResponse.json({
      ok: true,
      emailSent: false,
      message: 'Your report was saved, but the email notification could not be sent. It is still available in the Admin dashboard.',
    });
  }

  return NextResponse.json({ ok: true, emailSent: true, message: 'Report sent. Thank you.' });
}
