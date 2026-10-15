import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { BlogApi } from './blog-api';
import type { BlogPost } from './blog-data';

export type ResolvedArticle = { post?: BlogPost; error?: string };

// Keep the current page visible until the article is ready to render.
export const resolveBlogArticle: ResolveFn<ResolvedArticle> = (route) => {
    if (route.queryParamMap.get('preview') === '1') return {};
    return inject(BlogApi).article(route.paramMap.get('locale')!, route.paramMap.get('slug')!)
        .then(post => ({ post }))
        .catch((error: Error) => ({ error: error.message }));
};
