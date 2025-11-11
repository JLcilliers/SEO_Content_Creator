const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  const jobId = process.argv[2] || 'job_1762803475900_l5sns9r';

  const now = Date.now();
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .lt('created_at', now + 1000)
    .maybeSingle();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (!data) {
    console.error('Job not found');
    process.exit(1);
  }

  console.log('=== JOB STATUS ===');
  console.log('Status:', data.status);
  console.log('Progress:', data.progress);
  console.log('Message:', data.message);
  console.log('Attempts:', data.attempts);
  console.log('');

  if (data.status === 'completed') {
    console.log('=== GENERATED CONTENT ===');
    console.log('');
    console.log('META TITLE:');
    console.log(data.result_meta_title || 'N/A');
    console.log('');
    console.log('META DESCRIPTION:');
    console.log(data.result_meta_description || 'N/A');
    console.log('');
    console.log('CONTENT (first 2000 chars):');
    console.log((data.result_content_markdown || 'N/A').substring(0, 2000));
    console.log('');
    console.log('CONTENT WORD COUNT:', (data.result_content_markdown || '').split(/\s+/).length);
    console.log('');
    console.log('FAQ (first 500 chars):');
    console.log((data.result_faq_raw || 'N/A').substring(0, 500));
    console.log('');
    console.log('SCHEMA JSON (first 500 chars):');
    console.log((data.result_schema_json_string || 'N/A').substring(0, 500));
    console.log('');
    console.log('PAGES CRAWLED:', data.result_pages?.length || 0);
  } else if (data.error) {
    console.log('=== ERROR ===');
    console.log(data.error);
  }
})();
