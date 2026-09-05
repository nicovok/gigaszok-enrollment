import { getTerms, postTerm, putTerm, deleteTerm_ } from "../controllers/term_controller";

export const termRoutes = {
  "/api/terms": { GET: getTerms, POST: postTerm },
  "/api/terms/:id": { PUT: putTerm, DELETE: deleteTerm_ },
};
