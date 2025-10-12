const axios = require('axios');

const SERVER_URL = 'http://5.189.141.151:3000';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

async function testRoutesHTTP() {
  console.log('🌐 Testing Routes HTTP endpoint...\n');

  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${SERVER_URL}/login`,
      `username=${USERNAME}&password=${PASSWORD}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      }
    );

    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      console.error('❌ Login failed - no cookies');
      return;
    }
    console.log('✅ Login successful\n');

    // 2. Get routes page
    console.log('2. Fetching routes page...');
    const routesResponse = await axios.get(`${SERVER_URL}/routes`, {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });

    console.log('✅ Routes page loaded');
    console.log(`   Status: ${routesResponse.status}`);
    console.log(`   Content length: ${routesResponse.data.length} bytes\n`);

    // Check if routes are in the HTML
    const html = routesResponse.data;
    const hasTable = html.includes('<table');
    const hasRoutes = html.includes('toshkent') || html.includes('andijon');
    const hasNoDataMessage = html.includes('Hozircha yo\'nalishlar yo\'q');

    console.log('📊 Page analysis:');
    console.log(`   Has table: ${hasTable ? 'YES' : 'NO'}`);
    console.log(`   Has routes: ${hasRoutes ? 'YES' : 'NO'}`);
    console.log(`   Has "no data" message: ${hasNoDataMessage ? 'YES' : 'NO'}`);

    if (hasNoDataMessage) {
      console.log('\n❌ PROBLEM: Page shows "no routes" message even though routes exist!');
    } else if (!hasRoutes) {
      console.log('\n⚠️  WARNING: Routes might not be rendering properly');
    } else {
      console.log('\n✅ Routes are rendering correctly!');
    }

    // Count table rows
    const trMatches = html.match(/<tr>/g);
    if (trMatches) {
      console.log(`\n   Table rows found: ${trMatches.length - 1} (excluding header)`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
    }
  }
}

testRoutesHTTP();
