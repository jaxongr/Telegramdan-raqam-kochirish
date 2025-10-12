const axios = require('axios');

const SERVER_URL = 'http://5.189.141.151:3000';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

async function testServerUI() {
  console.log('Testing Server UI...\n');

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
      console.error('❌ Login failed - no cookies received');
      return;
    }

    console.log('✅ Login successful');

    // 2. Test Groups Page
    console.log('\n2. Testing Groups page...');
    const groupsResponse = await axios.get(`${SERVER_URL}/groups`, {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });

    const groupsCount = (groupsResponse.data.match(/<tr>/g) || []).length - 1; // -1 for header row
    console.log(`✅ Groups page works - ${groupsCount} groups found`);

    // 3. Test Routes Page
    console.log('\n3. Testing Routes page...');
    const routesResponse = await axios.get(`${SERVER_URL}/routes`, {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });

    const routesCount = (routesResponse.data.match(/<tr>/g) || []).length - 1;
    console.log(`✅ Routes page works - ${routesCount} routes found`);

    // 4. Test Dashboard
    console.log('\n4. Testing Dashboard...');
    const dashboardResponse = await axios.get(`${SERVER_URL}/dashboard`, {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });

    if (dashboardResponse.data.includes('Dashboard')) {
      console.log('✅ Dashboard page works');
    }

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data.substring(0, 200));
    }
  }
}

testServerUI();