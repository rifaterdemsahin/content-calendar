# Drop folder for YouTube Studio and Skool exports

Put exports here so Claude can read them. These files are public to anyone who can see the repo, so check what you commit.

| File | Where it comes from |
| :--- | :--- |
| `channel-365d.csv` | Studio → Analytics → Advanced mode → date range "Last 365 days" → Export → CSV. Include watch time (hours), subscribers, views, impressions, impressions CTR. |
| `videos-365d.csv` | Same screen, "Content" tab, one row per video: views, watch time (hours), average view duration, average percentage viewed, impressions CTR, subscribers gained. |
| `traffic-sources-90d.csv` | Studio → Analytics → Reach → Traffic source types (last 90 days). |
| `skool-weekly.csv` | Columns: `week_start,free_members,paid_members,weekly_active,new_from_youtube,posts,comments`. One row per week, by hand. |

Revenue, email addresses and anything private should stay out of these files.
