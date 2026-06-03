import fs from 'fs';

const token = "EAAcE9dH6efgBRQDDSJfZCRM5Xt1Dvg8E0iZC9kfHf2yZCAuccW9Nto01hqulhrQSb0jnHtDhJMHujXbgMfBmGI4T0I5RkPRNmT8LkKCcFYjRtBZA6i3nNCJfbI8KyI7AiBrZCIkebvQhM3aAFvTE2YGZAJJ734yEYbkx1xd356LFB5XOIzSVBFPeQp5JdrrkWRerTq5ct6vL4pX0Lv1YhKs8axjZC645ornJqf7x1Nk8m6GfvVTQaZBot6a1Fex91BiHXKLGoZCwkL21gQj4YReTI";
const phoneId = "1115420824985745";

async function check() {
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneId}?fields=name,whatsapp_business_account`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log("Phone Info:", data);
    
    if (data.whatsapp_business_account && data.whatsapp_business_account.id) {
      const wabaId = data.whatsapp_business_account.id;
      const tplUrl = `https://graph.facebook.com/v18.0/${wabaId}/message_templates?name=bhogpass`;
      const tplRes = await fetch(tplUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tplData = await tplRes.json();
      console.log("Templates:", JSON.stringify(tplData, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

check();
