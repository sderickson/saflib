import { createHandler } from "@saflib/node-express";

export const logoutHandler = createHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(200).json({});
    return;
  }
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.status(200).json({});
  });
});
