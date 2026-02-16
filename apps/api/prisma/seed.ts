import { PrismaClient, SourceCategory, SourceType } from '@prisma/client';

const prisma = new PrismaClient();

const defaultSources = [
  { name: 'TechCrunch', category: SourceCategory.WEB_NEWS, type: SourceType.RSS, url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'The Verge', category: SourceCategory.WEB_NEWS, type: SourceType.RSS, url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'Ars Technica', category: SourceCategory.WEB_NEWS, type: SourceType.RSS, url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Wired', category: SourceCategory.WEB_NEWS, type: SourceType.RSS, url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
  { name: 'VentureBeat', category: SourceCategory.WEB_NEWS, type: SourceType.RSS, url: 'https://venturebeat.com/ai/feed/' },
  { name: 'MIT Technology Review', category: SourceCategory.WEB_NEWS, type: SourceType.RSS, url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/' },
  { name: 'Hacker News', category: SourceCategory.WEB_NEWS, type: SourceType.RSS, url: 'https://hnrss.org/frontpage' },
  { name: 'r/MachineLearning', category: SourceCategory.SOCIAL_MEDIA, type: SourceType.RSS, url: 'https://www.reddit.com/r/MachineLearning/.rss' },
  { name: 'r/artificial', category: SourceCategory.SOCIAL_MEDIA, type: SourceType.RSS, url: 'https://www.reddit.com/r/artificial/.rss' },
  { name: 'r/LocalLLaMA', category: SourceCategory.SOCIAL_MEDIA, type: SourceType.RSS, url: 'https://www.reddit.com/r/LocalLLaMA/.rss' },
  { name: 'arXiv cs.AI', category: SourceCategory.RESEARCH_LABS, type: SourceType.RSS, url: 'https://rss.arxiv.org/rss/cs.AI' },
  { name: 'arXiv cs.CL', category: SourceCategory.RESEARCH_LABS, type: SourceType.RSS, url: 'https://rss.arxiv.org/rss/cs.CL' },
  { name: 'arXiv cs.CV', category: SourceCategory.RESEARCH_LABS, type: SourceType.RSS, url: 'https://rss.arxiv.org/rss/cs.CV' },
  { name: 'arXiv cs.LG', category: SourceCategory.RESEARCH_LABS, type: SourceType.RSS, url: 'https://rss.arxiv.org/rss/cs.LG' },
  { name: 'arXiv stat.ML', category: SourceCategory.RESEARCH_LABS, type: SourceType.RSS, url: 'https://rss.arxiv.org/rss/stat.ML' },
  { name: 'Google DeepMind Blog', category: SourceCategory.RESEARCH_LABS, type: SourceType.RSS, url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'OpenAI Blog', category: SourceCategory.RESEARCH_LABS, type: SourceType.RSS, url: 'https://openai.com/news/rss.xml' },
  { name: 'Anthropic Blog', category: SourceCategory.RESEARCH_LABS, type: SourceType.RSS, url: 'https://www.anthropic.com/news/rss.xml' },
  { name: 'Meta AI', category: SourceCategory.RESEARCH_LABS, type: SourceType.RSS, url: 'https://ai.meta.com/blog/rss/' },
  { name: 'AWS AI/ML Blog', category: SourceCategory.CLOUD, type: SourceType.RSS, url: 'https://aws.amazon.com/blogs/machine-learning/feed/' },
  { name: 'Google Cloud AI Blog', category: SourceCategory.CLOUD, type: SourceType.RSS, url: 'https://cloud.google.com/blog/products/ai-machine-learning/rss/' },
  { name: 'Azure AI Blog', category: SourceCategory.CLOUD, type: SourceType.RSS, url: 'https://azure.microsoft.com/en-us/blog/feed/' },
  { name: 'NVIDIA Developer Blog', category: SourceCategory.CLOUD, type: SourceType.RSS, url: 'https://developer.nvidia.com/blog/feed/' },
  { name: 'Stanford HAI', category: SourceCategory.UNIVERSITIES, type: SourceType.RSS, url: 'https://hai.stanford.edu/news/feed' },
  { name: 'MIT CSAIL', category: SourceCategory.UNIVERSITIES, type: SourceType.RSS, url: 'https://www.csail.mit.edu/news/rss.xml' },
  { name: 'CMU Machine Learning', category: SourceCategory.UNIVERSITIES, type: SourceType.RSS, url: 'https://blog.ml.cmu.edu/feed/' },
  { name: 'Berkeley AI Research', category: SourceCategory.UNIVERSITIES, type: SourceType.RSS, url: 'https://bair.berkeley.edu/blog/feed.xml' },
];

async function main(): Promise<void> {
  for (const source of defaultSources) {
    await prisma.source.upsert({
      where: { name: source.name },
      update: source,
      create: source,
    });
  }
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
