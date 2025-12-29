
const FIREBASE_URL = "https://sameh-5d64f-default-rtdb.europe-west1.firebasedatabase.app/";

export const updateAlarmStatus = async (status: boolean) => {
  try {
    const response = await fetch(`${FIREBASE_URL}/alarm.json`, {
      method: 'PUT',
      body: JSON.stringify(status),
    });
    if (!response.ok) throw new Error('Failed to update Firebase');
    return await response.json();
  } catch (error) {
    console.error('Firebase Error:', error);
  }
};

export const logThreatToFirebase = async (image: string) => {
  try {
    const timestamp = new Date().toISOString();
    // We store the full base64 string so it can be reconstructed as an image later.
    await fetch(`${FIREBASE_URL}/threats.json`, {
      method: 'POST',
      body: JSON.stringify({
        timestamp,
        image: image // Removed truncation to ensure images are valid
      }),
    });
  } catch (error) {
    console.error('Firebase Logging Error:', error);
  }
};

export const getThreatsFromFirebase = async () => {
  try {
    const response = await fetch(`${FIREBASE_URL}/threats.json`);
    if (!response.ok) throw new Error('Failed to fetch from Firebase');
    const data = await response.json();
    
    if (!data) return [];
    
    // Convert Firebase object format { id: { data } } to an array
    return Object.keys(data).map(key => ({
      id: key,
      timestamp: new Date(data[key].timestamp).toLocaleTimeString(),
      image: data[key].image
    })).reverse(); // Newest first
  } catch (error) {
    console.error('Firebase Fetch Error:', error);
    return [];
  }
};
