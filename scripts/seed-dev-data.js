import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs if needed for passwords or emails

// --- Configuration ---
// For local development, you can hardcode these if environment variables are not set.
// IMPORTANT: NEVER commit your actual SUPABASE_SERVICE_ROLE_KEY to a repository.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const NUM_USERS = 7; // Increased for more variety
const COMPANIES_PER_USER = 2; // Max companies per user
const POSTS_PER_ENTITY = 3; // Posts per user profile and per company
const COMMENTS_PER_POST = 2;

// Available post categories (mirroring PostCategory type from frontend)
const POST_CATEGORIES = [
  'general', 'business_update', 'industry_news', 'job_opportunity',
  'event', 'question', 'partnership', 'product_launch'
];

// --- Mock Data Arrays ---
const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah', 'Ian', 'Julia'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const COMPANY_PREFIXES = ['Apex', 'Nova', 'Quantum', 'Stellar', 'Zenith', 'Momentum', 'Synergy', 'Catalyst', 'Pinnacle', 'Fusion'];
const COMPANY_SUFFIXES = ['Solutions', 'Dynamics', 'Innovations', 'Group', 'Enterprises', 'Labs', 'Tech', 'Works', 'Global', 'Systems'];
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Services', 'Retail', 'Consulting', 'Education', 'Real Estate'];

const POST_THEMES = [
  "Just launched our new {product}! Check it out at {website}. #launch #{category}",
  "Exciting business update: We've achieved {milestone}! Thanks to our amazing team. #business #{category}",
  "Sharing some industry news: {news_item}. What are your thoughts? #news #{category}",
  "We're hiring for a {job_role}! Know anyone? #jobs #{category} #hiring",
  "Join us for our upcoming event on {event_topic}! Register here: {link} #event #{category}",
  "Quick question for the community: How do you handle {challenge}? #question #{category}",
  "Thrilled to announce a new partnership with {partner_company}! Together we'll achieve great things. #partnership #{category}",
  "Reflecting on a great week. What was your biggest win? #general #{category}"
];

const COMMENT_PHRASES = [
  "This is great news! Congratulations!",
  "Interesting perspective, thanks for sharing.",
  "I agree, this is a significant development.",
  "Could you elaborate a bit more on that?",
  "Looking forward to seeing more!",
  "Helpful insights, much appreciated.",
  "Well said!"
];

// --- Helper Functions ---
function getRandomElement(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMockPostContent(category) {
  let theme = getRandomElement(POST_THEMES);
  theme = theme.replace('{product}', getRandomElement(['WidgetPro', 'ServiceX', 'PlatformZ']))
               .replace('{website}', 'ourwebsite.example.com')
               .replace('{milestone}', getRandomElement(['1000 users', 'ISO certification', 'record profits']))
               .replace('{news_item}', getRandomElement(['AI advancements', 'market trends', 'regulatory changes']))
               .replace('{job_role}', getRandomElement(['Software Engineer', 'Marketing Manager', 'Sales Lead']))
               .replace('{event_topic}', getRandomElement(['Digital Transformation', 'Future of Work', 'Sustainable Growth']))
               .replace('{link}', 'event-link.example.com')
               .replace('{challenge}', getRandomElement(['scaling operations', 'customer retention', 'supply chain issues']))
               .replace('{partner_company}', `${getRandomElement(COMPANY_PREFIXES)} ${getRandomElement(COMPANY_SUFFIXES)}`)
               .replace('#{category}', `#${category.replace('_', '')}`);
  return theme;
}

async function seedData() {
  if (!SUPABASE_URL || SUPABASE_URL === 'http://your-supabase-url') { // Added check for placeholder
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set or is using a placeholder value.');
    return;
  }
  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'your-service-role-key-placeholder') {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set or is using the placeholder value.');
    console.error('This key is required for seeding. Please set it as an environment variable or update the placeholder in the script for local development (DO NOT COMMIT YOUR REAL KEY).');
    console.error('You can find your service_role key in the Supabase project settings (API section).');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('--- Starting Dev Data Seeding Script (with Mock Data) ---');

  const createdUsers = [];
  const createdCompanies = [];
  const createdPosts = [];
  const createdComments = [];

  let rmarshallUserId = null;
  let candoBusinessCompanyId = null;

  try {
    // --- Create Specific CanDoBusiness User and Company ---
    console.log('Creating CanDoBusiness specific user and company...');
    const cdbUserEmail = 'rmarshall@candobusiness.ca';
    const cdbUserPassword = 'password'; // As requested
    const cdbUserName = 'R Marshall'; // Mock name
    const cdbUserAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cdbUserName)}`;
    let cdbUserId = null;

    // Check if user already exists
    const { data: existingCdbUser, error: checkError } = await supabase
      .from('users') // Assuming your public users table or profiles table has an email column
      .select('id')
      .eq('email', cdbUserEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116: 'single row not found'
        console.error('Error checking for existing CanDoBusiness user:', checkError.message);
    }

    if (existingCdbUser) {
        cdbUserId = existingCdbUser.id;
        console.log(`CanDoBusiness user ${cdbUserEmail} already exists with ID: ${cdbUserId}. Skipping user creation.`);
    } else {
        const { data: cdbAuthData, error: cdbAuthError } = await supabase.auth.admin.createUser({
            email: cdbUserEmail,
            password: cdbUserPassword,
            email_confirm: true,
        });

        if (cdbAuthError) {
            console.error(`Error creating CanDoBusiness user ${cdbUserEmail}:`, cdbAuthError.message);
        } else {
            cdbUserId = cdbAuthData.user.id;
            console.log(`CanDoBusiness user created: ${cdbUserName} <${cdbUserEmail}> (ID: ${cdbUserId})`);

            const { error: cdbRpcError } = await supabase.rpc('internal_upsert_profile_for_user', {
                p_user_id: cdbUserId, p_email: cdbUserEmail, p_name: cdbUserName, p_avatar_url: cdbUserAvatar
            });
            if (cdbRpcError) console.error(`Error upserting profile for ${cdbUserEmail}:`, cdbRpcError.message);
        }
    }
    
    if (cdbUserId) {
        createdUsers.push({ id: cdbUserId, email: cdbUserEmail, name: cdbUserName, avatar_url: cdbUserAvatar });

        const cdbCompanyName = 'CanDoBusiness';
        const cdbCompanyAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cdbCompanyName.replace(/\s+/g, ''))}`;
        const cdbIndustry = getRandomElement(INDUSTRIES);
        
        const cdbCompanyData = {
            name: cdbCompanyName,
            description: `The official ${cdbCompanyName} company profile. Connecting businesses and fostering growth.`,
            website: `https://www.candobusiness.ca`,
            industry: cdbIndustry,
            owner_id: cdbUserId,
            avatar_url: cdbCompanyAvatar,
            verification_status: 'TIER1_VERIFIED', // Make it verified
            country: 'Canada',
            year_founded: 2024, // Mock year
            business_type: 'Corporation',
            employee_count: getRandomElement(['11-50', '51-200']),
            services: ['Networking', 'Business Development', 'Platform Services']
        };

        // Check if company already exists
        const { data: existingCdbCompany, error: checkCompanyError } = await supabase
            .from('companies')
            .select('id')
            .eq('name', cdbCompanyName)
            .eq('owner_id', cdbUserId)
            .single();

        if (checkCompanyError && checkCompanyError.code !== 'PGRST116') {
            console.error('Error checking for existing CanDoBusiness company:', checkCompanyError.message);
        }
        
        if (existingCdbCompany) {
            console.log(`Company ${cdbCompanyName} for user ${cdbUserEmail} already exists. Skipping company creation.`);
            // Optionally, you could fetch and add it to createdCompanies if needed later
            const { data: fullExistingCompany, error: fetchErr } = await supabase.from('companies').select().eq('id', existingCdbCompany.id).single();
            if (fullExistingCompany && !fetchErr) {
                createdCompanies.push({ ...fullExistingCompany, owner: {id: cdbUserId, email: cdbUserEmail, name: cdbUserName }});
            } else if (fetchErr) {
                console.error('Error fetching existing CanDoBusiness company details:', fetchErr.message);
            }

        } else {
            const { data: newCdbCompany, error: cdbCompanyError } = await supabase.from('companies').insert(cdbCompanyData).select().single();
            if (cdbCompanyError) {
                console.error(`Error creating company ${cdbCompanyName} for ${cdbUserEmail}:`, cdbCompanyError.message);
            } else {
                console.log(`Company created: ${newCdbCompany.name} (Owner: ${cdbUserName})`);
                createdCompanies.push({ ...newCdbCompany, owner: {id: cdbUserId, email: cdbUserEmail, name: cdbUserName } });
                rmarshallUserId = cdbUserId;
                candoBusinessCompanyId = newCdbCompany.id;
                console.log(`CanDoBusiness user ${cdbUserName} (${cdbUserEmail}) and company '${cdbCompanyData.name}' created successfully.`);
            }
        }
    }
    console.log('Finished CanDoBusiness specific setup.');
    // --- End Specific CanDoBusiness User and Company ---

    // 1. Create Users
    console.log(`Creating ${NUM_USERS} users...`);
    for (let i = 0; i < NUM_USERS; i++) {
      const firstName = getRandomElement(FIRST_NAMES);
      const lastName = getRandomElement(LAST_NAMES);
      const userName = `${firstName} ${lastName}`;
      const userEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomInt(1,99)}@example.com`;
      const userPassword = `Pass${uuidv4().slice(0,8)}!`;
      const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}%20${lastName}`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userEmail, password: userPassword, email_confirm: true,
      });

      if (authError) {
        console.error(`Error creating user ${userEmail}:`, authError.message);
        continue;
      }
      const userId = authData.user.id;
      console.log(`User created: ${userName} <${userEmail}> (ID: ${userId})`);

      const { error: rpcError } = await supabase.rpc('internal_upsert_profile_for_user', {
        p_user_id: userId, p_email: userEmail, p_name: userName, p_avatar_url: avatarUrl
      });
      if (rpcError) console.error(`Error upserting profile for ${userEmail}:`, rpcError.message);
      createdUsers.push({ id: userId, email: userEmail, name: userName, avatar_url: avatarUrl });
    }
    console.log(`${createdUsers.length} users created successfully.`);

    // 2. Create Companies
    console.log('Creating companies...');
    for (const user of createdUsers) {
      const numCompanies = getRandomInt(0, COMPANIES_PER_USER);
      for (let i = 0; i < numCompanies; i++) {
        const prefix = getRandomElement(COMPANY_PREFIXES);
        const suffix = getRandomElement(COMPANY_SUFFIXES);
        const companyName = `${prefix} ${suffix} ${i > 0 ? (i + 1) : ''}`.trim();
        const industry = getRandomElement(INDUSTRIES);
        const companyAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${companyName.replace(/\s+/g, '')}`;

        const companyData = {
          name: companyName,
          description: `A leading provider in the ${industry} sector, ${companyName} focuses on innovative solutions. Owned by ${user.name}.`,
          website: `https://www.${prefix.toLowerCase()}${suffix.toLowerCase()}.example.com`,
          industry: industry,
          owner_id: user.id,
          avatar_url: companyAvatar,
          verification_status: getRandomElement(['UNVERIFIED', 'TIER1_PENDING', 'TIER1_VERIFIED']),
          country: 'Canada',
          year_founded: getRandomInt(1990, 2023),
          business_type: getRandomElement(['Corporation', 'LLC', 'Partnership']),
          employee_count: getRandomElement(['1-10', '11-50', '51-200', '201-500']),
          services: [getRandomElement(['Consulting', 'Development', 'Support', 'Analytics']), getRandomElement(['Strategy', 'Implementation'])]
        };
        const { data: newCompany, error: companyError } = await supabase.from('companies').insert(companyData).select().single();
        if (companyError) {
          console.error(`Error creating company for ${user.email}:`, companyError.message);
          continue;
        }
        console.log(`Company created: ${newCompany.name} (Owner: ${user.name})`);
        createdCompanies.push({ ...newCompany, owner: user });
      }
    }
    console.log(`${createdCompanies.length} companies created successfully.`);

    // 3. Create Posts
    console.log('Creating posts...');
    const entitiesToPostAs = [...createdUsers.map(u => ({...u, type: 'user'})), ...createdCompanies.map(c => ({...c, type: 'company'}))];

    for (const entity of entitiesToPostAs) {
        for (let i = 0; i < POSTS_PER_ENTITY; i++) {
            const category = getRandomElement(POST_CATEGORIES);
            const postContent = generateMockPostContent(category);
            const postData = {
                user_id: entity.type === 'user' ? entity.id : entity.owner_id, // or entity.owner.id if company obj structure is different
                company_id: entity.type === 'company' ? entity.id : null,
                content: `${postContent} (Posted as ${entity.name})`,
                category: category,
                author_subscription_tier: 'REGULAR',
                media_urls: [], media_types: [],
            };
            const { data: newPost, error: postError } = await supabase.from('posts').insert(postData).select().single();
            if (postError) {
                console.error(`Error creating post for ${entity.type} ${entity.name}:`, postError.message);
                continue;
            }
            createdPosts.push({ ...newPost, authorEntity: entity, authorType: entity.type });
        }
    }
    console.log(`${createdPosts.length} posts created successfully.`);

    // 4. Create Comments
    console.log('Creating comments...');
    if (createdUsers.length > 0 && createdPosts.length > 0) { // Allow comments even if only 1 user for self-interaction testing
      for (const post of createdPosts) {
        for (let i = 0; i < COMMENTS_PER_POST; i++) {
          let commenter = getRandomElement(createdUsers);
          // Allow self-commenting for testing variety, or prevent if (post.authorEntity.id === commenter.id && post.authorType === 'user' && createdUsers.length > 1)
          const commentData = {
            post_id: post.id,
            user_id: commenter.id,
            content: `${getRandomElement(COMMENT_PHRASES)} - ${commenter.name}`,
          };
          const { error: commentError } = await supabase.from('post_comments').insert(commentData);
          if (commentError) {
            console.error(`Error creating comment for post ${post.id} by ${commenter.email}:`, commentError.message);
          }
        }
      }
      console.log('Comments created (approx).');
    } else {
      console.log('Skipping comments: Not enough users or posts created.');
    }

    // --- Create Interconnected Data for Suggestions ---
    console.log('--- Creating Interconnected Data for Suggestions ---');
    if (rmarshallUserId && createdUsers.length > 1) {
      const NUM_RMARSHALL_DIRECT_CONNECTIONS = Math.min(3, createdUsers.length -1); // Connect rmarshall to up to 3 other users
      const otherUsers = createdUsers.filter(u => u.id !== rmarshallUserId);
      const rmarshallDirectConnections = [];

      console.log(`Creating direct connections for rmarshall (${rmarshallUserId})...`);
      for (let i = 0; i < NUM_RMARSHALL_DIRECT_CONNECTIONS && i < otherUsers.length; i++) {
        const targetUser = otherUsers[i];
        const { data: conn, error: connError } = await supabase.from('user_connections').insert([
          { requester_id: rmarshallUserId, addressee_id: targetUser.id, status: 'ACCEPTED' },
          { requester_id: targetUser.id, addressee_id: rmarshallUserId, status: 'ACCEPTED' } // Mutual connection
        ]).select();

        if (connError) {
          console.error(`Error creating connection between ${rmarshallUserId} and ${targetUser.id}:`, connError.message);
        } else if (conn) {
          console.log(`Created accepted connection between rmarshall and ${targetUser.email}`);
          rmarshallDirectConnections.push(targetUser);
        }
      }

      // Create 2nd-degree connections for PYMK (connections of rmarshall's connections)
      console.log('Creating 2nd-degree connections for rmarshall\'s PYMK suggestions...');
      const NUM_SECOND_DEGREE_TARGETS = Math.min(2, otherUsers.length - NUM_RMARSHALL_DIRECT_CONNECTIONS);

      for (const directConnection of rmarshallDirectConnections) {
        const potentialSecondDegreeUsers = otherUsers.filter(
          u => u.id !== directConnection.id && !rmarshallDirectConnections.find(dc => dc.id === u.id) && u.id !== rmarshallUserId
        );
        for (let j = 0; j < NUM_SECOND_DEGREE_TARGETS && j < potentialSecondDegreeUsers.length; j++) {
          const secondDegreeTarget = potentialSecondDegreeUsers[j];
          const { error: sdConnError } = await supabase.from('user_connections').insert([
            { requester_id: directConnection.id, addressee_id: secondDegreeTarget.id, status: 'ACCEPTED' },
            { requester_id: secondDegreeTarget.id, addressee_id: directConnection.id, status: 'ACCEPTED' }
          ]);
          if (sdConnError) {
            console.error(`Error creating 2nd-degree connection between ${directConnection.email} and ${secondDegreeTarget.email}:`, sdConnError.message);
          } else {
            console.log(`Created 2nd-degree connection: ${directConnection.email} <-> ${secondDegreeTarget.email}`);
          }
        }
      }

      // Make rmarshall's connections follow some companies for CYMK
      console.log('Making rmarshall\'s connections follow companies for CYMK suggestions...');
      const companiesNotOwnedByRmarshall = createdCompanies.filter(c => c.id !== candoBusinessCompanyId); // Simple filter for now
      const NUM_COMPANIES_TO_FOLLOW_PER_CONNECTION = Math.min(2, companiesNotOwnedByRmarshall.length);

      if (companiesNotOwnedByRmarshall.length > 0) {
        for (const directConnection of rmarshallDirectConnections) {
          const companiesToFollow = getRandomElements(companiesNotOwnedByRmarshall, NUM_COMPANIES_TO_FOLLOW_PER_CONNECTION);
          for (const companyToFollow of companiesToFollow) {
            // Ensure the connection isn't already following this company (idempotency check)
            const { data: existingFollow, error: checkError } = await supabase
              .from('user_company_follows')
              .select('user_id')
              .eq('user_id', directConnection.id)
              .eq('company_id', companyToFollow.id)
              .maybeSingle();

            if (checkError) {
                console.error(`Error checking existing follow for ${directConnection.email} and ${companyToFollow.name}:`, checkError.message);
                continue;
            }
            if (existingFollow) {
                console.log(`${directConnection.email} already follows ${companyToFollow.name}.`);
                continue;
            }

            const { error: followError } = await supabase.from('user_company_follows').insert({
              user_id: directConnection.id,
              company_id: companyToFollow.id,
              role: 'follower' // or another relevant role
            });
            if (followError) {
              console.error(`Error making ${directConnection.email} follow ${companyToFollow.name}:`, followError.message);
            } else {
              console.log(`${directConnection.email} now follows ${companyToFollow.name}`);
            }
          }
        }
      } else {
        console.log('No suitable companies for rmarshall\'s connections to follow for CYMK.');
      }
    } else {
      console.log('Not enough users to create interconnected data for rmarshall or rmarshall not found.');
    }

    console.log('--- Dev Data Seeding Script Finished Successfully ---');
    console.log(`Created: ${createdUsers.length} users, ${createdCompanies.length} companies, ${createdPosts.length} posts, ${createdComments.length} comments.`);
    if (rmarshallUserId) console.log(`Special user rmarshall@candobusiness.ca created with ID: ${rmarshallUserId}`);

  } catch (error) {
    console.error('!!! --- An unexpected error occurred during seeding --- !!!', error);
  }
}

seedData().catch(err => {
  console.error("!!! --- Seeding script failed catastrophically --- !!!");
  console.error(err);
}); 