import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { decode, sign, verify } from "hono/jwt";
import { z } from "zod";

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: { userId: string };
}>();

app.use("/api/v1/blog/*", async (c, next) => {
  try {
    const header = c.req.header("Authorization") || "";
    const user = await verify(header, c.env.JWT_SECRET);
    if (user) {
      c.set("userId", String(user.id));
      await next();
    } else {
      c.status(403);
      return c.json({ error: "Un-Authorized" });
    }
  } catch (error) {}
});

app.post("/api/v1/blog", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const body = await c.req.json();
    const blog = await prisma.blog.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: "1",
      },
    });
    return c.json({ id: blog.id });
  } catch (error) {
    c.status(500);
    return c.json({ message: "Internal server error" });
  }
});
app.put("/api/v1/blog", async (c) => {
  try {
    const body = await c.req.json();
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const blog = await prisma.blog.update({
      where: body.id,
      data: {
        title: body.title,
        content: body.content,
      },
    });
    return c.json({ id: blog.id });
  } catch (error) {
    return c.json({ message: "Internal server error" });
  }
});
app.get("/api/v1/blog", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const blog = await prisma.blog.findMany({});
  return c.json({ blog: blog });
});

app.get("/api/v1/blog/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const id = c.req.param("id");
  try {
    const blog = await prisma.blog.findFirst({
      where: {
        id: id,
      },
    });
    return c.json({ blog });
  } catch (error) {
    c.status(500);
    return c.json({ message: "Internal server error" });
  }
});
