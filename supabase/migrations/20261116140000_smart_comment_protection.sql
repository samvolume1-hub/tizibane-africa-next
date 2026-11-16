-- TIZIBANE Smart Comment Protection.
-- Additive database guard: rejects prohibited comments even when a client
-- bypasses the Next.js server actions and writes directly through Supabase.
-- Apply this migration to the Supabase project after reviewing the feature PR.

create or replace function public.tizibane_normalize_comment(input_text text)
returns text
language sql
immutable
parallel safe
as $$
  select translate(
    regexp_replace(lower(coalesce(input_text, '')), '[^a-z0-9@!$]+', '', 'g'),
    '013457@$!',
    'oieastasi'
  );
$$;

create or replace function public.tizibane_guard_comment_content()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  normalized_body text;
  blocked_terms text[] := array[
    'fuck','fucking','fucker','motherfucker','shit','bullshit','bitch','bastard',
    'asshole','arsehole','dickhead','cunt','twat','wanker','jackass','dumbass',
    'dipshit','shithead','whore','slut','cocksucker','idiot','moron','imbecile',
    'stupid','retard','retarded','loser','worthless','useless','pathetic','pervert',
    'nigger','nigga','coon','darkie','spic','wetback','chink','gook','kike',
    'raghead','towelhead','beaner','subhuman','sendnudes','sendmenudes',
    'showmeyourbody','iwanttorapeyou','rapeyou','pornography','porn','sexvideo',
    'nudevideo','kill yourself','killyourself','gokillyourself','end your life',
    'endyourlife','takeyourownlife','youaredead','deaththreat','bombthreat',
    'stabyou','beatyouup','breakyourbones','iwillkillyou','iwillhurtyou',
    'youhavewon','claimyourprize','freemoney','instantcash','doubleyourmoney',
    'guaranteedprofit','sendyourpassword','sendmeyourotp','sendotp',
    'mobilemoneypin','mpesapin','airtelmoneypin','mtnmomopin','bitcoin giveaway',
    'officialadmin','supportteam','securityteam','verifyyouraccounthere',
    'sendlogindetails','sendpassword','sendverificationcode','fake support',
    'buyfollowers','cheapfollowers','freefollowers','buylikes','cheaplikes',
    'buyviews','buycomments','followforfollow','likeforlike','dmforpromotion',
    'bitly','tinyurl','buydrugs','selldrugs','drugdealer','cocaineforsale',
    'heroinforsale','fakepassport','fakeid','hireahacker','hackingservice',
    'malwareforsale','ransomwareservice','stolencreditcards','hitmanforhire',
    'humantrafficking','underagenudes','childporn','minorforsex','underagesex',
    'meetaminor','grooming','sellachild','buyachild','forcedlabour',
    'dmme','whatsappme','telegramme','linkinbio','clickmylink',
    'joinmywhatsappgroup','joinmytelegramgroup','youmustobeyme',
    'iwillleakyourpictures','iwillruinyourreputation','letusbullythisperson'
  ];
  term text;
begin
  normalized_body := public.tizibane_normalize_comment(new.body);

  foreach term in array blocked_terms loop
    if length(term) >= 4 and position(
      public.tizibane_normalize_comment(term) in normalized_body
    ) > 0 then
      raise exception using
        errcode = 'check_violation',
        message = 'Your comment contains language or content that is not permitted in the TIZIBANE community. Please revise it and try again.';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists tizibane_comment_content_guard on public.comments;
create trigger tizibane_comment_content_guard
before insert or update of body on public.comments
for each row execute function public.tizibane_guard_comment_content();
