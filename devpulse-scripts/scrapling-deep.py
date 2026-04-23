#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Scrapling 海外深度内容采集脚本
采集 HackerNews 评论、GitHub README、DEV.to 文章、Product Hunt 产品详情
输出与 enhance-digest.js 兼容的 Markdown 文件

用法:
  python scrapling-deep.py                       # 今天
  python scrapling-deep.py --date 2026-04-15     # 指定日期
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote_plus

# Windows UTF-8
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# 代理设置（海外站通过代理加速）
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / '..' / 'output'

PROXY = os.environ.get('HTTP_PROXY', os.environ.get('http_proxy', 'http://127.0.0.1:7897'))
if not PROXY:
    PROXY = 'http://127.0.0.1:7897'

# ─── 工具函数 ───

def get_today():
    return datetime.now().strftime('%Y-%m-%d')

def get_weekday():
    days = ['日', '一', '二', '三', '四', '五', '六']
    return f"星期{days[datetime.now().weekday()]}"

def star_display(score):
    """10分制 → 星级显示"""
    if score >= 9: return '★' * 5
    if score >= 7: return '★' * 4 + '☆'
    if score >= 5: return '★' * 3 + '☆' * 2
    return '★' * 2 + '☆' * 3

def truncate(text, max_len=120):
    if not text: return ''
    text = text.replace('\n', ' ').strip()
    return text[:max_len] + '...' if len(text) > max_len else text

def clean_text(text):
    """清理 HTML 标签和多余空白"""
    if not text: return ''
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def score_item(title, meta=''):
    """简单评分规则（后续由 enhance-digest.js 的 AI 重新评分）"""
    t = (title + ' ' + meta).lower()
    score = 7
    if any(kw in t for kw in ['claude', 'gpt', 'llm', 'ai', 'agent', 'openai', 'anthropic']):
        score += 1
    if any(kw in t for kw in ['rust', 'python', 'typescript', 'security', 'database']):
        score += 1
    if any(kw in t for kw in ['awesome', 'best', 'top', 'guide', 'framework']):
        score += 1
    return min(score, 10)


# ─── URL 提取：从现有 daily-digest 中读取链接 ───

def extract_urls_from_digest(digest_path):
    """从 daily-digest Markdown 中提取各平台 URL"""
    hn_items = []   # (title, url, meta)
    devto_items = []
    ph_items = []

    if not os.path.exists(digest_path):
        print(f"  [WARN] 文件不存在: {digest_path}")
        return hn_items, devto_items, ph_items

    with open(digest_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 找到各平台区块
    in_hn = False
    in_devto = False
    in_ph = False

    for line in content.split('\n'):
        if 'HackerNews' in line and line.strip().startswith('**'):
            in_hn, in_devto, in_ph = True, False, False
            continue
        if 'DEV.to' in line and line.strip().startswith('**'):
            in_hn, in_devto, in_ph = False, True, False
            continue
        if 'Product Hunt' in line and line.strip().startswith('**'):
            in_hn, in_devto, in_ph = False, False, True
            continue
        if line.strip().startswith('**'):
            in_hn, in_devto, in_ph = False, False, False
            continue

        # 解析列表项: - [title](url) · meta
        m = re.match(r'^-\s+\[([^\]]+)\]\(([^)]+)\)(?:\s*·\s*(.+))?', line)
        if not m:
            continue

        title, url, meta = m.group(1), m.group(2), m.group(3) or ''

        if in_hn:
            hn_items.append((title, url, meta))
        elif in_devto:
            devto_items.append((title, url, meta))
        elif in_ph:
            ph_items.append((title, url, meta))

    return hn_items[:10], devto_items[:5], ph_items[:5]


# ─── GitHub 仓库列表提取 ───

def extract_repos_from_trending(trending_path):
    """从 github-trending Markdown 表格中提取仓库名"""
    repos = []
    if not os.path.exists(trending_path):
        print(f"  [WARN] 文件不存在: {trending_path}")
        return repos

    with open(trending_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 只取"今日新项目"区（到下一个 ### 之前）
    lines = content.split('\n')
    in_daily = False
    for line in lines:
        if '今日新项目' in line:
            in_daily = True
            continue
        if line.startswith('###') and in_daily:
            break
        if not in_daily:
            continue

        m = re.match(r'^\|\s*\d+\s*\|\s*\[([^\]]+)\]\(([^)]+)\)(?:<br><small>([^<]*)</small>)?\s*\|\s*(\S+)\s*\|\s*\*?\*?([^*|]+)\*?\*?\s*\|\s*(\S+)\s*\|', line)
        if m:
            name = m.group(1)
            url = m.group(2)
            desc = m.group(3) or ''
            lang = m.group(4) if m.group(4) != '-' else ''
            stars = m.group(5).strip()
            repos.append({
                'name': name, 'url': url, 'desc': desc,
                'language': lang, 'stars': stars
            })

    return repos[:10]


# ─── HN 评论采集 ───

def scrape_hn(hn_items):
    """通过 HN Algolia API 获取 item ID，再用 Scrapling 抓评论"""
    print(f"  [HN] 采集 {len(hn_items)} 条热帖评论...")
    results = []

    try:
        from scrapling.fetchers import Fetcher
        import httpx
    except ImportError:
        print("  [HN] SKIP: scrapling 未安装")
        return results

    fetcher = Fetcher()

    for title, ext_url, meta in hn_items:
        try:
            # Step 1: 用 Algolia API 反查 HN item ID
            search_url = f"https://hn.algolia.com/api/v1/search?query={quote_plus(title[:60])}&tags=story&hitsPerPage=1"
            resp = httpx.get(search_url, timeout=10, proxy=PROXY)
            if resp.status_code != 200:
                time.sleep(0.5)
                continue

            data = resp.json()
            hits = data.get('hits', [])
            if not hits:
                time.sleep(0.5)
                continue

            item_id = hits[0]['objectID']
            points = hits[0].get('points', 0)
            num_comments = hits[0].get('num_comments', 0)

            # Step 2: 抓取评论页
            hn_url = f"https://news.ycombinator.com/item?id={item_id}"
            page = fetcher.get(hn_url, timeout=15, proxy=PROXY)
            text = page.get_all_text() if hasattr(page, 'get_all_text') else ''

            # 提取评论：HN 评论在 .commtext 中
            comments = []
            for el in page.css('.commtext')[:5]:
                cmt = el.text if hasattr(el, 'text') else ''
                if cmt and len(cmt) > 20:
                    comments.append(clean_text(cmt)[:100])

            comment_summary = ' / '.join(comments[:3]) if comments else '无热门评论'

            score = score_item(title, meta)
            meta_str = f"{points}分 · {num_comments}评"
            summary = f"热门评论: {comment_summary}"

            results.append({
                'title': title,
                'url': hn_url,
                'meta': meta_str,
                'summary': summary,
                'score': score,
            })

            time.sleep(1.0)  # HN 限速

        except Exception as e:
            print(f"    [HN] 跳过 '{title[:30]}': {e}")
            continue

    print(f"    [HN] 完成: {len(results)} 条")
    return results


# ─── GitHub README 采集 ───

def scrape_github(repos):
    """抓取 GitHub 仓库的 README 内容"""
    print(f"  [GitHub] 采集 {len(repos)} 个仓库 README...")
    results = []

    try:
        from scrapling.fetchers import Fetcher
    except ImportError:
        print("  [GitHub] SKIP: scrapling 未安装")
        return results

    fetcher = Fetcher()

    for repo in repos:
        try:
            url = repo['url']  # https://github.com/owner/repo
            page = fetcher.get(url, timeout=15, proxy=PROXY)
            text = page.get_all_text() if hasattr(page, 'get_all_text') else ''

            # 提取 README 内容
            readme_parts = []
            for el in page.css('article.markdown-body'):
                t = el.text if hasattr(el, 'text') else ''
                if t:
                    readme_parts.append(clean_text(t))

            readme_text = readme_parts[0] if readme_parts else ''
            readme_preview = truncate(readme_text, 150)

            # 提取 last commit / issues
            last_commit = ''
            for el in page.css('relative-time'):
                dt = el.attrib.get('datetime', '') if hasattr(el, 'attrib') else ''
                if dt:
                    last_commit = dt[:10]
                    break

            open_issues = ''
            for el in page.css('#issues-repo-tab-count'):
                open_issues = el.text if hasattr(el, 'text') else ''
                break

            # 评分
            score = 7
            stars_str = repo.get('stars', '')
            try:
                stars_num = float(stars_str.replace('k', '').replace(',', ''))
                if 'k' in stars_str.lower():
                    stars_num *= 1000
                if stars_num >= 500: score += 2
                elif stars_num >= 100: score += 1
            except ValueError:
                pass

            score = min(score_item(repo['name'], readme_text), 10)
            meta_str = f"{repo.get('language', '?')} · {stars_str} stars"
            if last_commit:
                meta_str += f" · 最近提交: {last_commit}"

            summary_parts = []
            if readme_preview:
                summary_parts.append(f"README: {readme_preview}")
            if open_issues:
                summary_parts.append(f"Issues: {open_issues}")
            summary = '. '.join(summary_parts) if summary_parts else repo.get('desc', '')

            results.append({
                'title': repo['name'],
                'url': url,
                'meta': meta_str,
                'summary': summary,
                'score': score,
            })

            time.sleep(0.5)

        except Exception as e:
            print(f"    [GitHub] 跳过 '{repo['name']}': {e}")
            continue

    print(f"    [GitHub] 完成: {len(results)} 条")
    return results


# ─── DEV.to 文章采集 ───

def scrape_devto(devto_items):
    """抓取 DEV.to 文章正文"""
    print(f"  [DEV.to] 采集 {len(devto_items)} 篇文章...")
    results = []

    try:
        from scrapling.fetchers import Fetcher
    except ImportError:
        print("  [DEV.to] SKIP: scrapling 未安装")
        return results

    fetcher = Fetcher()

    for title, url, meta in devto_items:
        try:
            page = fetcher.get(url, timeout=15, proxy=PROXY)
            text = page.get_all_text() if hasattr(page, 'get_all_text') else ''

            # 提取文章正文
            body_parts = []
            for sel in ['.crayons-article__body', '#article-body', 'article .basis-full',
                        '.crayons-article__main', 'article', '#main-content']:
                for el in page.css(sel):
                    t = el.text if hasattr(el, 'text') else ''
                    if t and len(t) > 100:  # 确保不是导航等短文本
                        body_parts.append(clean_text(t))
                        break
                if body_parts:
                    break

            # 如果选择器都没命中，从全文中截取
            if not body_parts and text and len(text) > 200:
                body_parts.append(clean_text(text[:500]))

            body_text = body_parts[0] if body_parts else ''
            body_preview = truncate(body_text, 150)

            # 提取标签
            tags = []
            for sel in ['.crayons-tag a span', '.spec__tags a', 'a.crayons-tag']:
                for el in page.css(sel):
                    t = el.text if hasattr(el, 'text') else ''
                    if t:
                        tags.append(t.strip())
            tag_str = ', '.join(tags[:5])

            # 提取 reactions
            reactions = ''
            for sel in ['.aggregate_reactions_counter .reactions-count', '.reactions-count',
                        '[data-testid="reactions-count"]']:
                for el in page.css(sel):
                    reactions = el.text if hasattr(el, 'text') else ''
                    if reactions:
                        break
                if reactions:
                    break

            # Reading time
            reading_time = ''
            for el in page.css('.article-reading-time'):
                reading_time = el.text if hasattr(el, 'text') else ''
                break

            score = score_item(title, body_text)
            meta_parts = []
            if reactions: meta_parts.append(f"{reactions} reactions")
            if reading_time: meta_parts.append(reading_time.strip())
            if tag_str: meta_parts.append(f"Tags: {tag_str}")
            meta_str = ' · '.join(meta_parts) if meta_parts else meta

            summary = f"摘要: {body_preview}" if body_preview else ''

            results.append({
                'title': title,
                'url': url,
                'meta': meta_str,
                'summary': summary,
                'score': score,
            })

            time.sleep(0.5)

        except Exception as e:
            print(f"    [DEV.to] 跳过 '{title[:30]}': {e}")
            continue

    print(f"    [DEV.to] 完成: {len(results)} 条")
    return results


# ─── Product Hunt 产品详情采集 ───

def scrape_producthunt(ph_items):
    """抓取 Product Hunt 产品详情页（先用 StealthyFetcher，失败则降级为基础信息）"""
    print(f"  [PH] 采集 {len(ph_items)} 个产品详情...")
    results = []

    for title, url, meta in ph_items:
        try:
            # 方案1: 尝试用 StealthyFetcher 抓页面
            page = None
            try:
                from scrapling.fetchers import StealthyFetcher
                stealthy = StealthyFetcher()
                page = stealthy.fetch(url, headless=True, network_idle=True, timeout=30000, proxy=PROXY)
                # 检查是否被 Cloudflare 拦截
                if page:
                    text = page.get_all_text() if hasattr(page, 'get_all_text') else ''
                    if 'security verification' in text.lower() or 'checking your browser' in text.lower():
                        page = None
            except Exception:
                page = None

            if page:
                # 成功抓取，提取详情
                tagline = ''
                for sel in ['h2', '.tagline', '[data-test="tagline"]']:
                    for el in page.css(sel):
                        t = el.text if hasattr(el, 'text') else ''
                        if t and 10 < len(t) < 150:
                            tagline = t.strip()
                            break
                    if tagline:
                        break

                desc = ''
                for sel in ['.description', '[data-test="product-description"]', '.styles_html']:
                    for el in page.css(sel):
                        t = el.text if hasattr(el, 'text') else ''
                        if t and len(t) > 20:
                            desc = clean_text(t)[:200]
                            break
                    if desc:
                        break

                upvotes = ''
                for el in page.css('[data-test="vote-count"]'):
                    upvotes = el.text if hasattr(el, 'text') else ''
                    break

                topics = []
                for el in page.css('[data-test="topic-name"]'):
                    t = el.text if hasattr(el, 'text') else ''
                    if t:
                        topics.append(t.strip())

                score = score_item(title, tagline + ' ' + desc)
                meta_parts = []
                if upvotes: meta_parts.append(f"{upvotes} upvotes")
                if topics: meta_parts.append(f"Topics: {', '.join(topics[:3])}")
                meta_str = ' · '.join(meta_parts) if meta_parts else meta

                summary_parts = []
                if tagline: summary_parts.append(tagline)
                if desc: summary_parts.append(truncate(desc, 100))
                summary = '. '.join(summary_parts)

                results.append({
                    'title': title, 'url': url, 'meta': meta_str,
                    'summary': summary, 'score': score,
                })
            else:
                # 降级：只有标题和链接
                results.append({
                    'title': title, 'url': url, 'meta': meta,
                    'summary': '', 'score': score_item(title, meta),
                })
            text = page.get_all_text() if hasattr(page, 'get_all_text') else ''

            # 提取 tagline
            tagline = ''
            for sel in ['h2', '.tagline', '[data-test="tagline"]']:
                for el in page.css(sel):
                    t = el.text if hasattr(el, 'text') else ''
                    if t and 10 < len(t) < 150:
                        tagline = t.strip()
                        break
                if tagline:
                    break

            # 提取 description
            desc = ''
            for sel in ['.description', '[data-test="product-description"]', '.styles_html']:
                for el in page.css(sel):
                    t = el.text if hasattr(el, 'text') else ''
                    if t and len(t) > 20:
                        desc = clean_text(t)[:200]
                        break
                if desc:
                    break

            # 提取 upvotes
            upvotes = ''
            for el in page.css('[data-test="vote-count"]'):
                upvotes = el.text if hasattr(el, 'text') else ''
                break

            # 提取 categories / topics
            topics = []
            for el in page.css('[data-test="topic-name"]'):
                t = el.text if hasattr(el, 'text') else ''
                if t:
                    topics.append(t.strip())

            score = score_item(title, tagline + ' ' + desc)
            meta_parts = []
            if upvotes: meta_parts.append(f"{upvotes} upvotes")
            if topics: meta_parts.append(f"Topics: {', '.join(topics[:3])}")
            meta_str = ' · '.join(meta_parts) if meta_parts else meta

            summary_parts = []
            if tagline: summary_parts.append(tagline)
            if desc: summary_parts.append(truncate(desc, 100))
            summary = '. '.join(summary_parts)

            results.append({
                'title': title,
                'url': url,
                'meta': meta_str,
                'summary': summary,
                'score': score,
            })

            time.sleep(2)  # PH StealthyFetcher 自身就很慢

        except Exception as e:
            print(f"    [PH] 降级 '{title[:30]}': {e}")
            # 降级：只有标题和链接
            results.append({
                'title': title, 'url': url, 'meta': meta,
                'summary': '', 'score': score_item(title, meta),
            })
            continue

    print(f"    [PH] 完成: {len(results)} 条")
    return results


# ─── Markdown 输出 ───

def write_markdown(path, date, weekday, hn_results, gh_results, devto_results, ph_results):
    """生成兼容 enhance-digest.js 的 Markdown 文件"""
    lines = [
        f"# 海外深度内容",
        f"",
        f"> {date} {weekday} · Scrapling 深度抓取",
        f"",
        f"---",
    ]

    total = 0

    if hn_results:
        lines.append("")
        lines.append("## HackerNews 热门评论")
        lines.append("")
        for item in hn_results:
            lines.append(f"- [{item['title']}]({item['url']}) · {item['meta']}")
            if item.get('summary'):
                lines.append(f"  > {item['summary']} · {item['score']}/10 {star_display(item['score'])}")
            lines.append("")
        total += len(hn_results)

    if gh_results:
        lines.append("")
        lines.append("## GitHub README 深度")
        lines.append("")
        for item in gh_results:
            lines.append(f"- [{item['title']}]({item['url']}) · {item['meta']}")
            if item.get('summary'):
                lines.append(f"  > {item['summary']} · {item['score']}/10 {star_display(item['score'])}")
            lines.append("")
        total += len(gh_results)

    if devto_results:
        lines.append("")
        lines.append("## DEV.to 文章精华")
        lines.append("")
        for item in devto_results:
            lines.append(f"- [{item['title']}]({item['url']}) · {item['meta']}")
            if item.get('summary'):
                lines.append(f"  > {item['summary']} · {item['score']}/10 {star_display(item['score'])}")
            lines.append("")
        total += len(devto_results)

    if ph_results:
        lines.append("")
        lines.append("## Product Hunt 产品详情")
        lines.append("")
        for item in ph_results:
            lines.append(f"- [{item['title']}]({item['url']}) · {item['meta']}")
            if item.get('summary'):
                lines.append(f"  > {item['summary']} · {item['score']}/10 {star_display(item['score'])}")
            lines.append("")
        total += len(ph_results)

    if total == 0:
        lines.append("")
        lines.append("*今日海外深度内容采集未获取到数据*")

    lines.append("")
    lines.append(f"---")
    lines.append(f"")
    lines.append(f"*数据来源：HackerNews、GitHub、DEV.to、Product Hunt · 共 {total} 条*")
    lines.append("")

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))

    print(f"  [OUTPUT] {path} ({total} 条)")


# ─── 主函数 ───

def main():
    parser = argparse.ArgumentParser(description='Scrapling 海外深度内容采集')
    parser.add_argument('--date', default=None, help='日期 YYYY-MM-DD（默认今天）')
    parser.add_argument('--output-dir', default=None, help='输出目录')
    args = parser.parse_args()

    date = args.date or get_today()
    weekday = get_weekday()
    output_dir = Path(args.output_dir) if args.output_dir else OUTPUT_DIR

    print(f"\n[Scrapling Deep] {date} {weekday}")
    print(f"  Output: {output_dir}")

    # 读取当天日报和 GitHub Trending
    digest_path = str(output_dir / f'daily-digest-{date}.md')
    trending_path = str(output_dir / f'github-trending-{date}.md')

    # 提取 URL
    hn_items, devto_items, ph_items = extract_urls_from_digest(digest_path)
    github_repos = extract_repos_from_trending(trending_path)

    print(f"  发现: HN={len(hn_items)} DEV.to={len(devto_items)} PH={len(ph_items)} GitHub={len(github_repos)}")

    # 采集
    hn_results = []
    gh_results = []
    devto_results = []
    ph_results = []

    try:
        hn_results = scrape_hn(hn_items)
    except Exception as e:
        print(f"  [HN] 模块失败: {e}")

    try:
        gh_results = scrape_github(github_repos)
    except Exception as e:
        print(f"  [GitHub] 模块失败: {e}")

    try:
        devto_results = scrape_devto(devto_items)
    except Exception as e:
        print(f"  [DEV.to] 模块失败: {e}")

    try:
        ph_results = scrape_producthunt(ph_items)
    except Exception as e:
        print(f"  [PH] 模块失败: {e}")

    # 输出
    output_path = str(output_dir / f'overseas-deep-{date}.md')
    write_markdown(output_path, date, weekday, hn_results, gh_results, devto_results, ph_results)

    print(f"  [DONE] 共采集 {len(hn_results)+len(gh_results)+len(devto_results)+len(ph_results)} 条")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"  [FATAL] {e}")
        # 始终 exit(0)，不阻塞 Node.js 管道
        sys.exit(0)
