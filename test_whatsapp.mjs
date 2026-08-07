const fetch = globalThis.fetch;

async function testWhatsapp() {
  const url = 'https://smca-bhogpass.vercel.app/api/send-whatsapp';
  
  const payload = {
    phone: "7003512007",
    name: "Admin Tester",
    eventName: "Test Event Launch",
    passes: [
      { label: "Admin Ticket 1", url: "https://smca-bhogpass.vercel.app/pass/TEST-ABC" },
      { label: "Admin Ticket 2", url: "https://smca-bhogpass.vercel.app/pass/TEST-XYZ" }
    ]
  };

  console.log(`Sending POST request to ${url}...`);
  console.log(`Payload:`, JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`\nStatus: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error triggering API:", error);
  }
}

testWhatsapp();
