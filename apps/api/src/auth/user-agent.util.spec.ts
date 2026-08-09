import { summarizeUserAgent } from './user-agent.util';

describe('summarizeUserAgent', () => {
  it('summarizes Chrome on Windows', () => {
    expect(
      summarizeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome · Windows');
  });

  it('summarizes PowerShell clients', () => {
    expect(
      summarizeUserAgent(
        'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8894',
      ),
    ).toBe('PowerShell · Windows');
  });

  it('handles device id fallback', () => {
    expect(summarizeUserAgent('device:abc123')).toBe('App / API client');
  });
});
