import fetch from 'node-fetch';

const token = "EAAcE9dH6efgBRhyZAGgdlwjn3cZCDZAXSZADtbRMKR0YQPW6yky0XBunbjnxJ8WfqLSzRSxmeBRaOt4koZAYvJp0tc0pwrTMPq6gGY7l1nRfh6kvlHHY7QowRDdMiCu7QhwBlfwZAOirKIiwiZCKS7NuFkMUD4B4IByeAGbNJZCBimxxG0ZBPHVwq2rfBMjauRAZDZD";
const phoneNumberId = "1116780434851634";
const toPhone = "919219435522"; // the phone number from your logs

async function testWhatsApp() {
  console.log(`Sending to ${toPhone}...`);
  
  const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'template',
      template: {
        name: "3p_direct_integration_test_template",
        language: { code: "en_US" }
      }
    })
  });

  const data = await response.json();
  console.log("\n--- META API RESPONSE ---");
  console.log(JSON.stringify(data, null, 2));
}

testWhatsApp();
