from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from jobspy import scrape_jobs
import pandas as pd
import uuid

app = FastAPI()

# Allow CORS for our React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JobRequest(BaseModel):
    roles: List[str]
    location: str

def get_country(location_str: str) -> str:
    loc = location_str.lower()
    if 'india' in loc: return 'India'
    if 'uk' in loc or 'united kingdom' in loc: return 'UK'
    if 'canada' in loc: return 'Canada'
    if 'australia' in loc: return 'Australia'
    return 'USA' # default

@app.post("/api/jobs")
def get_jobs(request: JobRequest):
    all_jobs = []
    country = get_country(request.location)
    
    for role in request.roles:
        try:
            print(f"Scraping jobs for {role} in {request.location} (Indeed Country: {country})...")
            # We scrape Indeed and LinkedIn primarily.
            jobs_df = scrape_jobs(
                site_name=["indeed", "linkedin", "zip_recruiter"],
                search_term=role,
                location=request.location,
                results_wanted=25,
                hours_old=72,
                country_indeed=country
            )
            
            if not jobs_df.empty:
                # JobSpy returns a DataFrame with NaNs, which aren't JSON serializable. We need to fill them.
                jobs_df = jobs_df.fillna("")
                
                for _, row in jobs_df.iterrows():
                    # Format matching our React frontend expectation
                    job = {
                        "id": str(uuid.uuid4()),
                        "title": row.get("title", "Unknown Title"),
                        "company_name": row.get("company", "Unknown Company"),
                        "url": row.get("job_url", ""),
                        "candidate_required_location": f"{row.get('city', '')}, {row.get('state', '')}".strip(', '),
                        "description": row.get("description", "")[:1000] # Trim description to avoid massive LLM payloads
                    }
                    all_jobs.append(job)
        except Exception as e:
            print(f"Error scraping for role {role}: {e}")
            
    # Simple deduplication based on URL
    unique_jobs = {job['url']: job for job in all_jobs if job['url']}
    final_jobs = list(unique_jobs.values())
    
    return {"jobs": final_jobs}
