<?php
/**
 * Legacy PHP mailer — DO NOT hard-code secrets here.
 * The admin panel (Node/Fastify) sends mail via src/lib/email.ts using:
 *   GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_TENANT_ID,
 *   GRAPH_FROM_EMAIL, GRAPH_FROM_NAME
 *
 * Configure those in .env.production / .env.local instead of this file.
 */
require_once __DIR__ . '/vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

$clientId = getenv('GRAPH_CLIENT_ID') ?: '';
$clientSecret = getenv('GRAPH_CLIENT_SECRET') ?: '';
$tenantId = getenv('GRAPH_TENANT_ID') ?: '';
$fromEmail = getenv('GRAPH_FROM_EMAIL') ?: 'notifications@fayyaztravels.com';
$fromName = getenv('GRAPH_FROM_NAME') ?: 'Fayyaz Travels';

$tokenCacheFile = sys_get_temp_dir() . '/visa_token_cache.json';

function getAccessToken()
{
    global $clientId, $clientSecret, $tenantId, $tokenCacheFile;

    if (!$clientId || !$clientSecret || !$tenantId) {
        throw new Exception(
            'Graph is not configured. Set GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_TENANT_ID.'
        );
    }

    if (file_exists($tokenCacheFile) && is_readable($tokenCacheFile)) {
        $tokenData = json_decode(file_get_contents($tokenCacheFile), true);
        if ($tokenData && isset($tokenData['expires_at']) && $tokenData['expires_at'] > time()) {
            return $tokenData['access_token'];
        }
    }

    $client = new Client([
        'verify' => false,
        'curl' => [
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ],
    ]);

    try {
        $tokenUrl = "https://login.microsoftonline.com/{$tenantId}/oauth2/v2.0/token";
        $tokenResponse = $client->post($tokenUrl, [
            'form_params' => [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'scope' => 'https://graph.microsoft.com/.default',
                'grant_type' => 'client_credentials',
            ],
        ]);

        $token = json_decode($tokenResponse->getBody()->getContents(), true);

        $tokenData = [
            'access_token' => $token['access_token'],
            'expires_at' => time() + $token['expires_in'] - 300,
        ];

        if (is_writable(dirname($tokenCacheFile))) {
            file_put_contents($tokenCacheFile, json_encode($tokenData));
        }

        return $token['access_token'];
    } catch (RequestException $e) {
        if (file_exists($tokenCacheFile) && is_writable($tokenCacheFile)) {
            unlink($tokenCacheFile);
        }
        throw new Exception('Failed to get access token: ' . $e->getMessage());
    }
}

function refreshTokenIfNeeded()
{
    global $tokenCacheFile;

    if (!file_exists($tokenCacheFile) || !is_readable($tokenCacheFile)) {
        return getAccessToken();
    }

    $tokenData = json_decode(file_get_contents($tokenCacheFile), true);
    if (!$tokenData || !isset($tokenData['expires_at']) || $tokenData['expires_at'] <= time()) {
        return getAccessToken();
    }

    return $tokenData['access_token'];
}

function sendEmail($to, $subject = 'Notification', $layout = 'default', $email_body = '', $isBtn = false, $btnUrl = '', $cc = [], $bcc = [], $email_id = '')
{
    global $fromEmail, $fromName;

    try {
        $accessToken = refreshTokenIfNeeded();
        $client = new Client([
            'verify' => false,
            'curl' => [
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
            ],
        ]);

        $buttonHtml = '';
        if ($isBtn && !empty($btnUrl)) {
            $buttonHtml = "
            <div style='text-align:center; margin: 25px 0;'>
                <a href='$btnUrl' class='button' style='display: inline-block; padding: 12px 24px; margin: 10px 5px; border-radius: 50px; text-decoration: none; background: linear-gradient(135deg, #14385C, #1a4a7c); color: white; font-weight: 500; transition: all 0.3s ease; border: none; box-shadow: 0 4px 8px rgba(0,0,0,0.1);'>Click Here</a>
                <p> If you are unable to click the button above, please copy and paste the following link into your browser: <a href='$btnUrl' style='color:#14385C; margin-top: 8px; display: inline-block;'>$btnUrl</a></small></p>
            </div>";
        }

        $html_template = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta name='viewport' content='width=device-width, initial-scale=1'>
            <meta http-equiv='Content-Type' content='text/html; charset=UTF-8'>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                body { font-family: 'Poppins', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; color: #333; line-height: 1.6; }
                .container { max-width: 650px; margin: 30px auto; background: #fff; padding: 0; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); overflow: hidden; border: 2px solid #14385C; }
                .header { background: linear-gradient(135deg, #14385C, #1a4a7c); color: #fff; padding: 25px 20px; text-align: center; }
                .header img { max-width: 200px; height: auto; }
                .content { padding: 35px 30px; text-align: left; font-size: 16px; line-height: 1.7; color: #444; border-bottom: 1px solid #eaeaea; }
                .content p { margin-bottom: 20px; }
                .footer { text-align: center; font-size: 13px; color: #777; padding: 20px; background-color: #f9f9f9; }
                .button { display: inline-block; padding: 12px 24px; margin: 10px 5px; border-radius: 50px; text-decoration: none; background: linear-gradient(135deg, #14385C, #1a4a7c); color: white; font-weight: 500; transition: all 0.3s ease; border: none; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                .button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
                .social-links { margin: 25px 0 15px; text-align: center; }
                .social-links a { display: inline-block; margin: 0 8px; transition: transform 0.3s ease; }
                .social-links a:hover { transform: scale(1.1); }
                .social-links img { width: 30px; height: 30px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .company-info { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; line-height: 1.6; }
                .company-info p { margin: 8px 0; }
                .highlight { background-color: #f8f9fa; padding: 20px; border-left: 4px solid #14385C; margin: 25px 0; border-radius: 0 8px 8px 0; }
                .divider { height: 1px; background: linear-gradient(to right, transparent, #ddd, transparent); margin: 25px 0; }
                @media (max-width: 600px) {
                    .container { width: 95%; margin: 15px auto; }
                    .content { padding: 25px 20px; }
                    .button { display: block; margin: 15px auto; width: 80%; text-align: center; }
                }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <img src='https://fayyaztravels.com/visa/assets/images/main-logo-white.png' alt='Fayyaz Travels Logo'>
                </div>
                <div class='content'>
                    $email_body
                    " . ($isBtn && !empty($btnUrl) ? $buttonHtml : '') . "
                    " . ($isBtn && !empty($btnUrl) ? "<div class='divider'></div>" : '') . "
                    <div class='highlight'>
                        <p>Need assistance with your travel plans? Our team of experts is ready to help you create unforgettable experiences.</p>
                        <a href='https://fayyaztravels.com/contact-us' class='button' style='color: white;'>Contact Us</a>
                    </div>
                    <div class='company-info'>
                        <p><strong>Fayyaz Travels</strong><br>
                        435 Orchard Rd, #11-00 Wisma Atria, Singapore 238877</p>
                        <p>Phone:  <a href='tel:+6562352900' style='color: #14385C; text-decoration: none;'>+65 6235 2900</a><br>
                        Email: <a href='mailto:info@fayyaztravels.com' style='color: #14385C; text-decoration: none;'>info@fayyaztravels.com</a><br>
                        Website: <a href='https://fayyaztravels.com' style='color: #14385C; text-decoration: none;'>www.fayyaztravels.com</a></p>
                        <div class='social-links'>
                            <a href='https://facebook.com/fayyaztravels'><img src='https://cdn-icons-png.flaticon.com/512/124/124010.png' alt='Facebook'></a>
                            <a href='https://instagram.com/fayyaztravels'><img src='https://cdn-icons-png.flaticon.com/512/174/174855.png' alt='Instagram'></a>
                            <a href='https://twitter.com/fayyaztravels'><img src='https://cdn-icons-png.flaticon.com/512/124/124021.png' alt='Twitter'></a>
                            <a href='https://linkedin.com/company/fayyaz-travels-pte-ltd'><img src='https://cdn-icons-png.flaticon.com/512/174/174857.png' alt='LinkedIn'></a>
                        </div>
                    </div>
                </div>
                <div class='footer'>
                    &copy; " . date("Y") . " Fayyaz Travels. All rights reserved.<br>
                    <small>This email was sent to you because you are a valued customer of Fayyaz Travels.</small>
                </div>
            </div>
        </body>
        </html>";

        $toRecipients = array_map(function ($email) {
            return ['emailAddress' => ['address' => $email]];
        }, (array)$to);

        $ccRecipients = array_map(function ($email) {
            return ['emailAddress' => ['address' => $email]];
        }, $cc);

        $bccRecipients = array_map(function ($email) {
            return ['emailAddress' => ['address' => $email]];
        }, $bcc);

        $message = [
            'message' => [
                'subject' => $subject,
                'body' => [
                    'contentType' => 'HTML',
                    'content' => $html_template,
                ],
                'toRecipients' => $toRecipients,
                'ccRecipients' => $ccRecipients,
                'bccRecipients' => $bccRecipients,
                'from' => [
                    'emailAddress' => [
                        'address' => $fromEmail,
                        'name' => $fromName
                    ],
                ],
            ],
        ];

        $response = $client->post(
            "https://graph.microsoft.com/v1.0/users/{$fromEmail}/sendMail",
            [
                'headers' => [
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ],
                'json' => $message,
            ]
        );

        return [
            'success' => true,
            'message' => "Email sent to {$to}",
            'status' => $response->getStatusCode(),
            'response_body' => $response->getBody()->getContents()
        ];
    } catch (RequestException $e) {
        $errorDetails = [];
        $responseBody = '';
        $statusCode = 0;

        if ($e->hasResponse()) {
            $response = $e->getResponse();
            $statusCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();
            $errorData = json_decode($responseBody, true);
            if ($errorData) {
                $errorDetails = $errorData;
            }
        }

        return [
            'success' => false,
            'message' => "Email sending failed: " . $e->getMessage(),
            'status_code' => $statusCode,
            'response_body' => $responseBody,
            'error_details' => $errorDetails,
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => "Email sending failed: " . $e->getMessage(),
        ];
    }
}
