import { defineRelations } from "drizzle-orm";
import * as authSchema from "./schema/auth";
import * as bootcampSchema from "./schema/bootcamp";
import * as courseSchema from "./schema/course";
import * as diskonSchema from "./schema/diskon";
import * as ebookSchema from "./schema/ebook";
import * as fileUploadSchema from "./schema/fileUpload";
import * as produkSchema from "./schema/produk";
import * as taarufSchema from "./schema/taaruf";
import * as userSchema from "./schema/user";
import * as wilayahSchema from "./schema/wilayah";

export const relations = defineRelations({
  ...authSchema,
  ...diskonSchema,
  ...produkSchema,
  ...bootcampSchema,
  ...ebookSchema,
  ...fileUploadSchema,
  ...courseSchema,
  ...taarufSchema,
  ...userSchema,
  ...wilayahSchema,
}, r => ({
  user: {
    profile: r.one.userProfile(),
    sessions: r.many.session({
      from: r.user.id,
      to: r.session.userId,
    }),
    accounts: r.many.account({
      from: r.user.id,
      to: r.account.userId,
    }),
    orders: r.many.orders(),
    courseProgresses: r.many.courseProgress(),
    requestedTaarufProses: r.many.taarufProses({ alias: "requesterUser" }),
    targetTaarufProses: r.many.taarufProses({ alias: "targetUser" }),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
  userProfile: {
    user: r.one.user({
      from: r.userProfile.userId,
      to: r.user.id,
    }),
  },
  diskon: {
    orders: r.many.orders(),
  },
  produk: {
    orders: r.many.orders(),
    bootcamp: r.one.bootcamp(),
    ebook: r.one.ebook(),
    course: r.one.course(),
  },
  orders: {
    user: r.one.user({
      from: r.orders.userId,
      to: r.user.id,
    }),
    produk: r.one.produk({
      from: r.orders.produkId,
      to: r.produk.id,
    }),
    diskon: r.one.diskon({
      from: r.orders.diskonId,
      to: r.diskon.id,
    }),
  },
  bootcamp: {
    produk: r.one.produk({
      from: r.bootcamp.produkId,
      to: r.produk.id,
    }),
  },
  ebook: {
    produk: r.one.produk({
      from: r.ebook.produkId,
      to: r.produk.id,
    }),
  },
  course: {
    produk: r.one.produk({
      from: r.course.produkId,
      to: r.produk.id,
    }),
    sections: r.many.courseSection(),
  },
  courseSection: {
    course: r.one.course({
      from: r.courseSection.courseId,
      to: r.course.id,
    }),
    lessons: r.many.courseLesson(),
  },
  courseLesson: {
    section: r.one.courseSection({
      from: r.courseLesson.sectionId,
      to: r.courseSection.id,
    }),
    progresses: r.many.courseProgress(),
  },
  courseProgress: {
    user: r.one.user({
      from: r.courseProgress.userId,
      to: r.user.id,
    }),
    lesson: r.one.courseLesson({
      from: r.courseProgress.lessonId,
      to: r.courseLesson.id,
    }),
  },
  taarufProses: {
    requesterUser: r.one.user({
      from: r.taarufProses.requesterUserId,
      to: r.user.id,
      alias: "requesterUser",
    }),
    targetUser: r.one.user({
      from: r.taarufProses.targetUserId,
      to: r.user.id,
      alias: "targetUser",
    }),
    logs: r.many.taarufProsesLog(),
  },
  taarufProsesLog: {
    proses: r.one.taarufProses({
      from: r.taarufProsesLog.prosesId,
      to: r.taarufProses.id,
    }),
  },
}));
