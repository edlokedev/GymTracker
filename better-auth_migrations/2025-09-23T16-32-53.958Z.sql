alter table "user" add column "email_verified" integer not null;

alter table "user" add column "created_at" date not null;

alter table "user" add column "updated_at" date not null;

alter table "account" add column "providerId" text not null;