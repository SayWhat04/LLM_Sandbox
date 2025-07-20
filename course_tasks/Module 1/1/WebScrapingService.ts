import { parse } from 'node-html-parser';

export class WebScrapingService {
  async fetchQuestion(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const root = parse(html);
      
      // Extract question from <p id="human-question"></p>
      const questionElement = root.querySelector('#human-question');
      const question = questionElement?.text?.trim();
      
      if (!question) {
        throw new Error('No question found in the specified HTML tag');
      }

      return question;
    } catch (error) {
      console.error('❌ Error fetching question:', error);
      throw error;
    }
  }

  async postAnswer(url: string, data: any): Promise<any> {
    try {
      // Convert JSON to form data
      const formData = new URLSearchParams();
      formData.append('username', data.username);
      formData.append('password', data.password);
      formData.append('answer', data.answer);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'accept': 'text/html'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`Failed to post answer: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('❌ Error posting answer:', error);
      throw error;
    }
  }
} 