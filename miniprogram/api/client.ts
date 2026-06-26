const BASE_URL = 'https://api.bereavement.example.com'; // Replace with actual domain

interface GuideRequest {
  persona_id: string;
  city?: string;
  answers: Record<string, string | boolean>;
}

export async function fetchPersonas() {
  const res = await uni.request({ url: `${BASE_URL}/api/personas`, method: 'GET' });
  return (res.data as any).personas;
}

export async function fetchGuide(data: GuideRequest) {
  const res = await uni.request({
    url: `${BASE_URL}/api/guide`,
    method: 'POST',
    data,
  });
  return res.data as any;
}

export async function fetchDelegationPdf(data: any): Promise<string> {
  const res = await uni.request({
    url: `${BASE_URL}/api/pdf/delegation-letter`,
    method: 'POST',
    data,
    responseType: 'arraybuffer',
  });
  // Save to temp file for preview
  const fs = uni.getFileSystemManager();
  const tmpPath = `${wx.env.USER_DATA_PATH}/delegation-letter.pdf`;
  fs.writeFileSync(tmpPath, res.data as ArrayBuffer);
  return tmpPath;
}
